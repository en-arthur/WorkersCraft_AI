  // Determine which API to use based on morph toggle and existing fragment
  const hasFragment = fragment && (
    (fragment.code && fragment.file_path) ||
    (fragment.files && fragment.files.length > 0)
  )
  const shouldUseMorph = useMorphApply && hasFragment
  const apiEndpoint = shouldUseMorph ? '/api/morph-chat' : '/api/chat'
