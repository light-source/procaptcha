import { ViteCommonJSConfig } from '@prosopo/config'
import path from 'path'

export default function () {
    return ViteCommonJSConfig('captcha-contract', path.resolve('./tsconfig.cjs.json'))
}