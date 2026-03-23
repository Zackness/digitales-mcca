export type DeviceId = string

export type Esp32Command =
  | {
      type: 'off'
    }
  | {
      type: 'text'
      text: string
      speedMs?: number
      intensity?: number
    }
  | {
      type: 'pattern'
      bitmap: number[]
      invert?: boolean
      intensity?: number
    }

export type Esp32State = {
  mode: 'off' | 'pattern' | 'text'
  intensity: number
  speedMs?: number
  invert?: boolean
  text?: string
  bitmap?: number[]
}

