'use strict'

const os = require('os')
const path = require('path')
const actions = require('@actions/core')
const cache = require('@actions/cache')
const toolCache = require('@actions/tool-cache')

async function main () {
  const version = actions.getInput('version') || '17.0.6'
  const useCache = actions.getInput('cache') || 'true'
  const cpu = actions.getInput('cpu') || 'baseline'

  const operatingSystem = os.platform()
  const architecture = os.arch()

  const abi = {
    linux: 'musl',
    darwin: 'none',
    win32: 'gnu'
  }[operatingSystem]

  const cacheKey = `llvm-${version}-${architecture}-${operatingSystem}-${abi}-${cpu}`
  const cachedPath = toolCache.find('llvm', cacheKey)
  if (cachedPath) {
    actions.info(`using cached LLVM install: ${cachedPath}`)
    actions.setOutput('MY_LLVM_PATH', cachedPath)
    return cachedPath
  }

  if (useCache) {
    const restorePath = path.join(process.env.RUNNER_TOOL_CACHE, cacheKey)
    actions.info(`trying to restore ${cacheKey} to ${restorePath}`)
    const restoredKey = await cache.restoreCache([restorePath], cacheKey)
    if (restoredKey) {
      actions.info(`using cached LLVM install: ${restorePath}`)
      actions.setOutput('MY_LLVM_PATH', cachedPath)
      return restorePath
    }
  }

  const extension = {
    linux: 'tar.xz',
    darwin: 'tar.xz',
    win32: 'zip'
  }[operatingSystem]
  const downloadUrl = `https://github.com/birth-software/fetch-llvm/releases/download/v${version}/llvm-${version}-${architecture}-${operatingSystem}-${abi}-${cpu}.${extension}`
  actions.info(`no cached version found. Downloading ${cacheKey} from ${downloadUrl}`)
  const downloadPath = await toolCache.downloadTool(downloadUrl)
  const extractedPath = extension === 'zip'
    ? await toolCache.extractZip(downloadPath)
    : await toolCache.extractTar(downloadPath, undefined, 'x')

  const llvmPath = path.join(extractedPath, cacheKey)
  const newCachedPath = await toolCache.cacheDir(llvmPath, 'llvm', cacheKey)

  if (useCache) {
    actions.info(`adding ${cacheKey} at ${newCachedPath} to local cache ${cacheKey}`)
    await cache.saveCache([newCachedPath], cacheKey)
  }
  actions.setOutput('MY_LLVM_PATH', newCachedPath)

  return newCachedPath
}

main().catch((err) => {
  console.error(err.stack)
  actions.setFailed(err.message)
  process.exit(1)
})
