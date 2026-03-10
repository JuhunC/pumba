import { stringify } from 'yaml'

export const toYaml = (value: unknown): string => stringify(value ?? {})
