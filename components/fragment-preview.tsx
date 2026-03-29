'use client'

import { FragmentInterpreter } from './fragment-interpreter'
import { FragmentWeb } from './fragment-web'
import { getTemplateId } from '@/lib/templates'
import {
  ExecutionResult,
  ExecutionResultInterpreter,
  ExecutionResultWeb,
} from '@/lib/types'
import { FragmentSchema } from '@/lib/schema'
import { DeepPartial } from 'ai'

interface DeviceConfig {
  width: number | string
  height: number | string
  label: string
}

export function FragmentPreview({ 
  result, 
  device,
  refreshKey,
  fragment,
  teamID,
  accessToken
}: { 
  result: ExecutionResult
  device?: DeviceConfig
  refreshKey?: number
  fragment?: DeepPartial<FragmentSchema>
  teamID?: string
  accessToken?: string
}) {
  if (getTemplateId(result.template) === 'code-interpreter-v1') {
    return <FragmentInterpreter result={result as ExecutionResultInterpreter} />
  }

  return <FragmentWeb result={result as ExecutionResultWeb} device={device} refreshKey={refreshKey} fragment={fragment} teamID={teamID} accessToken={accessToken} />
}
