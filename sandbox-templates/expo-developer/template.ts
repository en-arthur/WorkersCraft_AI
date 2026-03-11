import { Template } from 'e2b'

export const template = Template()
  .fromNodeImage()
  .setWorkdir('/home/user/expo-app')
  .runCmd('npx create-expo-app@latest . --yes')
  .runCmd('mv /home/user/expo-app/* /home/user/ && rm -rf /home/user/expo-app')
  .setWorkdir('/home/user')
  // No setStartCmd - we'll start Metro manually after writing files
