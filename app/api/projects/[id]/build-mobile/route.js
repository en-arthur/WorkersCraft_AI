import { createClient } from '@supabase/supabase-js'
import { Sandbox } from '@e2b/code-interpreter'
import { getGitHubToken, getGitHubUser, parseGitHubUrl } from '@/lib/github'
import { injectGitHubSecret } from '@/lib/github-secrets'
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32b'

function decrypt(text) {
  const parts = text.split(':')
  const iv = Buffer.from(parts.shift(), 'hex')
  const encrypted = Buffer.from(parts.join(':'), 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv)
  let decrypted = decipher.update(encrypted)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  return decrypted.toString()
}

function getAndroidWorkflow(buildType) {
  const isRelease = buildType === 'release'
  return `name: WorkersCraft Android Build
on:
  workflow_dispatch:
    inputs:
      build_type:
        default: '${buildType}'
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
      - run: npm install
      - run: npx expo prebuild --platform android --non-interactive
${isRelease ? `      - name: Decode keystore
        run: |
          echo "$KEYSTORE_BASE64" | base64 -d > android/app/release.jks
        env:
          KEYSTORE_BASE64: \${{ secrets.KEYSTORE_BASE64 }}
      - name: Build AAB
        run: cd android && ./gradlew bundleRelease
        env:
          KEYSTORE_PASSWORD: \${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: \${{ secrets.KEY_ALIAS }}
          KEY_PASSWORD: \${{ secrets.KEY_PASSWORD }}` : `      - run: cd android && ./gradlew assembleDebug`}
      - uses: actions/upload-artifact@v4
        with:
          name: android-${buildType}
          path: |
            android/app/build/outputs/apk/**/*.apk
            android/app/build/outputs/bundle/**/*.aab
          retention-days: 30
`
}

function getIosWorkflow(buildType) {
  const isRelease = buildType === 'release'
  return `name: WorkersCraft iOS Build
on:
  workflow_dispatch:
    inputs:
      build_type:
        default: '${buildType}'
jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm install
      - run: npx expo prebuild --platform ios --non-interactive
      - uses: actions/cache@v3
        with:
          path: ios/Pods
          key: pods-\${{ hashFiles('ios/Podfile.lock') }}
          restore-keys: pods-
      - run: cd ios && pod install --repo-update
${isRelease ? `      - name: Import certificate
        run: |
          echo "$P12_BASE64" | base64 -d > cert.p12
          security create-keychain -p "" build.keychain
          security import cert.p12 -k build.keychain -P "$P12_PASSWORD" -T /usr/bin/codesign
          security list-keychains -s build.keychain
          security default-keychain -s build.keychain
          security unlock-keychain -p "" build.keychain
          echo "$PROVISION_BASE64" | base64 -d > profile.mobileprovision
          mkdir -p ~/Library/MobileDevice/Provisioning\\ Profiles
          cp profile.mobileprovision ~/Library/MobileDevice/Provisioning\\ Profiles/
        env:
          P12_BASE64: \${{ secrets.IOS_P12_BASE64 }}
          P12_PASSWORD: \${{ secrets.IOS_P12_PASSWORD }}
          PROVISION_BASE64: \${{ secrets.IOS_PROVISION_BASE64 }}
      - name: Build IPA
        run: |
          cd ios
          xcodebuild -workspace *.xcworkspace -scheme "$SCHEME" -configuration Release \\
            -archivePath build.xcarchive archive
          xcodebuild -exportArchive -archivePath build.xcarchive \\
            -exportOptionsPlist ExportOptions.plist -exportPath ./output
        env:
          SCHEME: \${{ secrets.IOS_SCHEME }}` : `      - name: Build unsigned IPA
        run: |
          cd ios
          xcodebuild -workspace *.xcworkspace -scheme "$(ls *.xcworkspace | sed 's/.xcworkspace//')" \\
            -configuration Debug -sdk iphonesimulator \\
            CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO CODE_SIGNING_ALLOWED=NO \\
            -derivedDataPath build
          cd build/Build/Products/Debug-iphonesimulator
          mkdir Payload && cp -r *.app Payload/
          zip -r app-debug.ipa Payload`}
      - uses: actions/upload-artifact@v4
        with:
          name: ios-${buildType}
          path: |
            ios/output/*.ipa
            ios/build/Build/Products/**/*.ipa
          retention-days: 30
`
}

export async function POST(request, { params }) {
  let sandbox = null
  try {
    const { id } = params
    const { platform, buildType = 'debug' } = await request.json()

    if (!['android', 'ios'].includes(platform)) {
      return Response.json({ error: 'platform must be android or ios' }, { status: 400 })
    }

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: project } = await supabase.from('projects').select('*').eq('id', id).eq('user_id', session.user.id).single()
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 })
    if (!project.github_repo_url || !project.github_branch) {
      return Response.json({ error: 'Project is not connected to GitHub' }, { status: 400 })
    }

    const githubToken = getGitHubToken(session)
    const githubUser = getGitHubUser(session)
    const { owner, repo } = parseGitHubUrl(project.github_repo_url)

    // Inject signing secrets for release builds
    if (buildType === 'release') {
      if (platform === 'android') {
        const { data: signing } = await supabase.from('user_integrations')
          .select('access_token').eq('user_id', session.user.id).eq('integration_type', 'android_signing').single()
        if (!signing) return Response.json({ error: 'Android signing not configured. Generate a keystore first.' }, { status: 400 })
        const { keystoreBase64, keystorePassword, keyAlias, keyPassword } = JSON.parse(decrypt(signing.access_token))
        await injectGitHubSecret(githubToken, owner, repo, 'KEYSTORE_BASE64', keystoreBase64)
        await injectGitHubSecret(githubToken, owner, repo, 'KEYSTORE_PASSWORD', keystorePassword)
        await injectGitHubSecret(githubToken, owner, repo, 'KEY_ALIAS', keyAlias)
        await injectGitHubSecret(githubToken, owner, repo, 'KEY_PASSWORD', keyPassword)
      } else {
        const { data: signing } = await supabase.from('user_integrations')
          .select('access_token').eq('user_id', session.user.id).eq('integration_type', 'ios_signing').single()
        if (!signing) return Response.json({ error: 'iOS signing not configured. Upload your certificates first.' }, { status: 400 })
        const { p12Base64, p12Password, provisionBase64, scheme } = JSON.parse(decrypt(signing.access_token))
        await injectGitHubSecret(githubToken, owner, repo, 'IOS_P12_BASE64', p12Base64)
        await injectGitHubSecret(githubToken, owner, repo, 'IOS_P12_PASSWORD', p12Password)
        await injectGitHubSecret(githubToken, owner, repo, 'IOS_PROVISION_BASE64', provisionBase64)
        await injectGitHubSecret(githubToken, owner, repo, 'IOS_SCHEME', scheme || repo)
      }
    }

    const workflowFile = `workerscraft-build-${platform}.yml`
    const workflowContent = platform === 'android' ? getAndroidWorkflow(buildType) : getIosWorkflow(buildType)

    // Use E2B to write and push the workflow file
    sandbox = await Sandbox.create()
    await sandbox.git.dangerouslyAuthenticate({ username: githubUser.username, password: githubToken })
    await sandbox.git.clone(project.github_repo_url, { path: '/home/user/repo', branch: project.github_branch })
    await sandbox.git.configureUser(githubUser.name, githubUser.email)
    await sandbox.commands.run('mkdir -p /home/user/repo/.github/workflows')
    await sandbox.files.write(`/home/user/repo/.github/workflows/${workflowFile}`, workflowContent)
    await sandbox.git.add('/home/user/repo')

    const status = await sandbox.git.status('/home/user/repo')
    if (status.fileStatus.length > 0) {
      await sandbox.git.commit('/home/user/repo', `ci: update ${workflowFile}`, {
        authorName: githubUser.name, authorEmail: githubUser.email,
      })
      await sandbox.git.push('/home/user/repo', {
        username: githubUser.username, password: githubToken,
        remote: 'origin', branch: project.github_branch,
      })
    }

    // Trigger workflow_dispatch
    const dispatchRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowFile}/dispatches`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: project.github_branch }),
      }
    )
    if (!dispatchRes.ok && dispatchRes.status !== 204) {
      const err = await dispatchRes.json().catch(() => ({}))
      throw new Error(err.message || `Failed to trigger workflow: ${dispatchRes.status}`)
    }

    // Wait briefly then get the run_id
    await new Promise(r => setTimeout(r, 3000))
    const runsRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowFile}/runs?per_page=1`,
      { headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.v3+json' } }
    )
    const runsData = await runsRes.json()
    const runId = runsData.workflow_runs?.[0]?.id || null

    // Save build record
    const { data: build } = await supabase.from('project_builds').insert({
      project_id: id,
      user_id: session.user.id,
      platform,
      build_type: buildType,
      status: 'queued',
      run_id: runId,
      workflow_file: workflowFile,
    }).select().single()

    return Response.json({ buildId: build.id, runId })
  } catch (error) {
    console.error('[build-mobile]', error)
    return Response.json({ error: error.message }, { status: 500 })
  } finally {
    if (sandbox) await sandbox.kill().catch(console.error)
  }
}
