import * as fs from 'fs'
import * as crypto from 'crypto'
import { promises as fsPromises } from 'fs'
import path from 'node:path'

export async function calculateFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5')
    const stream = fs.createReadStream(filePath)

    stream.on('data', (data) => {
      hash.update(data)
    })

    stream.on('end', () => {
      resolve(hash.digest('hex'))
    })

    stream.on('error', (error) => {
      reject(error)
    })
  })
}

// 比较两个文件是否一致
export async function compareFiles(file1: string, file2: string): Promise<boolean> {
  const sourceStats = await fsPromises.stat(file1)
  const targetStats = await fsPromises.stat(file2)

  // 比较文件大小
  if (sourceStats.size !== targetStats.size) return true

  // 如果大小相同，计算文件哈希进行精确比较
  const sourceHash = await calculateFileHash(file1)
  const targetHash = await calculateFileHash(file2)

  return sourceHash !== targetHash
}

export async function getAllFilesInDirectory(dirPath: string): Promise<string[]> {
  const files: string[] = []

  const entries = await fsPromises.readdir(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      const subFiles = await getAllFilesInDirectory(fullPath)
      files.push(...subFiles)
    } else {
      files.push(fullPath)
    }
  }

  return files
}

/**
 * 异步递归复制目录
 */
export async function copyDirectoryAsync(src: string, dest: string): Promise<void> {
  try {
    await fsPromises.mkdir(dest, { recursive: true })
    const entries = await fsPromises.readdir(src, { withFileTypes: true })

    await Promise.all(
      entries.map(async (entry) => {
        const srcPath = path.join(src, entry.name)
        const destPath = path.join(dest, entry.name)

        if (entry.isDirectory()) {
          await copyDirectoryAsync(srcPath, destPath)
        } else {
          await fsPromises.copyFile(srcPath, destPath)
        }
      })
    )
  } catch (error) {
    console.error(`[FileUtil] 异步复制目录失败 [${src} -> ${dest}]:`, error)
    throw error
  }
}

/**
 * 检查目录是否需要更新
 */
export async function checkDirectoryNeedsUpdate(
  sourcePath: string,
  targetPath: string
): Promise<boolean> {
  try {
    const sourceFiles = await getAllFilesInDirectory(sourcePath)
    const targetFiles = await getAllFilesInDirectory(targetPath)

    const sourceFileSet = new Set(sourceFiles.map((f) => path.relative(sourcePath, f)))
    const targetFileSet = new Set(targetFiles.map((f) => path.relative(targetPath, f)))

    // 检查是否有文件缺失
    for (const relativeFile of sourceFileSet) {
      if (!targetFileSet.has(relativeFile)) return true
    }

    // 检查文件内容是否有变化
    for (const relativeFile of sourceFileSet) {
      const sourceFile = path.join(sourcePath, relativeFile)
      const targetFile = path.join(targetPath, relativeFile)
      if (await compareFiles(sourceFile, targetFile)) return true
    }

    return false
  } catch (error) {
    console.error('[FileUtil] 检查目录更新时发生错误:', error)
    return true
  }
}
