'use client'

import { FragmentInterpreter } from './fragment-interpreter'
import { FragmentWeb } from './fragment-web'
import { getTemplateId } from '@/lib/templates'
import {
  ExecutionResult,
  ExecutionResultInterpreter,
  ExecutionResultWeb,
} from '@/lib/types'

interface DeviceConfig {
  width: number | string
  height: number | string
  label: string
}

export function FragmentPreview({ 
  result, 
  device 
}: { 
  result: ExecutionResult
  device?: DeviceConfig
}) {
  if (getTemplateId(result.template) === 'code-interpreter-v1') {
    return <FragmentInterpreter result={result as ExecutionResultInterpreter} />
  }

  return <FragmentWeb result={result as ExecutionResultWeb} device={device} />
}
