import { Template, defaultBuildLogger } from 'e2b'
import { template as expoTemplate } from './template'

Template.build(expoTemplate, 'expo-developer-dev', {
  cpuCount: 4,
  memoryMB: 8192,
  onBuildLogs: defaultBuildLogger(),
})
