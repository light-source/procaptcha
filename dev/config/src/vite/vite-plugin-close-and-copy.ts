import { Plugin } from 'vite'
import { getLogger } from '@prosopo/common'
import fs from 'node:fs'
import path from 'path'

export interface ClosePluginOptions {
    srcDir: string
    destDir: string[]
}

const log = getLogger(`Info`, `config.vite.vite-plugin-close.js`)

/**
 *   description: Closes Vite after the bundle has been build. Optionally copies the bundle to a different directory.
 *   @param { ClosePluginOptions } options - The options object
 **/
export default function VitePluginCloseAndCopy(options?: ClosePluginOptions): Plugin {
    const __dirname = path.resolve()
    return {
        name: 'close-plugin', // required, will show up in warnings and errors
        buildStart() {
            log.info('Bundle build started')
        },
        buildEnd(error) {
            log.info('Build end')
            if (error) {
                console.log(error)
                log.error(error)
            }
        },
        closeBundle() {
            if (options) {
                options.destDir.forEach((destDir) => {
                    clearOutputDirJS(__dirname, destDir)
                    log.info(`Bundle cleared from ${options.destDir}`)
                    copyBundle(__dirname, options.srcDir, destDir)
                    log.info(`Bundle copied to ${options.destDir}`)
                })
            }
            log.info('Bundle closed')
        },
    }
}

const clearOutputDirJS = (__dirname: string, destDir: string) =>
    fs
        .readdirSync(path.resolve(__dirname, destDir))
        .filter((file) => file.endsWith('js'))
        .map((file) => {
            fs.rmSync(path.resolve(__dirname, destDir, file))
        })

const copyBundle = (__dirname: string, srcDir: string, destDir: string) =>
    fs
        .readdirSync(path.resolve(__dirname, srcDir))
        .filter((file) => file.endsWith('js'))
        .map((file) => {
            fs.copyFileSync(path.resolve(__dirname, srcDir, file), path.resolve(__dirname, destDir, file))
        })
