#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

const createDirectoryStructure = () => {
  const directories = [
    'src/pages',
    'src/components/common',
    'src/components/FileUpload',
    'src/components/Editor',
    'src/components/Progress',
    'src/components/ProjectCard',
    'src/hooks',
    'src/store',
    'src/services',
    'src/types',
    'src/utils',
    'src/styles',
    'electron/services/database/migrations',
    'electron/services/database/repositories',
    'electron/services/whisper',
    'electron/services/file',
    'electron/services/export',
    'electron/ipc',
    'shared/types',
    'shared/constants',
    'tests/unit',
    'tests/integration',
    'tests/e2e',
    'assets/icons',
    'assets/images',
    'config'
  ]

  console.log('Creating directory structure...')
  directories.forEach((dir) => {
    const dirPath = path.join(process.cwd(), dir)
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
      console.log(`✓ Created ${dir}`)
    } else {
      console.log(`- ${dir} already exists`)
    }
  })
}

const createEnvFile = async () => {
  const envPath = path.join(process.cwd(), '.env')
  const envExamplePath = path.join(process.cwd(), '.env.example')

  if (fs.existsSync(envPath)) {
    console.log('\n.env file already exists. Skipping...')
    return
  }

  console.log('\n=== API Configuration ===')
  const openaiKey = await question('Enter your OpenAI API Key (or press Enter to skip): ')

  let envContent = fs.readFileSync(envExamplePath, 'utf-8')

  if (openaiKey) {
    envContent = envContent.replace('your_openai_api_key_here', openaiKey)
  }

  fs.writeFileSync(envPath, envContent)
  console.log('✓ Created .env file')
}

const createInitialFiles = () => {
  console.log('\nCreating initial files...')

  // Create index.html
  const indexHtml = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Transcription App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`
  fs.writeFileSync(path.join(process.cwd(), 'index.html'), indexHtml)
  console.log('✓ Created index.html')

  // Create main.tsx
  const mainTsx = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`
  fs.writeFileSync(path.join(process.cwd(), 'src/main.tsx'), mainTsx)
  console.log('✓ Created src/main.tsx')

  // Create App.tsx
  const appTsx = `import React from 'react'

function App() {
  return (
    <div className="app">
      <h1>Transcription App</h1>
      <p>Welcome to the Audio Transcription Application</p>
    </div>
  )
}

export default App
`
  fs.writeFileSync(path.join(process.cwd(), 'src/App.tsx'), appTsx)
  console.log('✓ Created src/App.tsx')

  // Create global.css
  const globalCss = `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app {
  padding: 2rem;
}
`
  fs.writeFileSync(path.join(process.cwd(), 'src/styles/global.css'), globalCss)
  console.log('✓ Created src/styles/global.css')
}

const setupHuskyPermissions = () => {
  console.log('\nSetting up Husky hook permissions...')
  const { execSync } = require('child_process')

  try {
    // Make husky hooks executable
    const hooks = ['.husky/pre-commit', '.husky/commit-msg', '.husky/pre-push']
    hooks.forEach((hook) => {
      const hookPath = path.join(process.cwd(), hook)
      if (fs.existsSync(hookPath)) {
        execSync(`chmod +x ${hookPath}`)
        console.log(`✓ Set executable permission for ${hook}`)
      }
    })
  } catch (error) {
    console.log('Note: Could not set hook permissions automatically.')
    console.log('Run manually: chmod +x .husky/pre-commit .husky/commit-msg .husky/pre-push')
  }
}

const main = async () => {
  console.log('=== Transcription App Setup ===\n')

  createDirectoryStructure()
  await createEnvFile()
  createInitialFiles()
  setupHuskyPermissions()

  console.log('\n✓ Setup complete!')
  console.log('\nNext steps:')
  console.log('1. npm install (or pnpm install)')
  console.log('2. Update .env file with your API keys')
  console.log('3. npm run dev:electron to start development')
  console.log('\nNote: After npm install, Husky hooks will be automatically installed.')

  rl.close()
}

main().catch((error) => {
  console.error('Setup failed:', error)
  process.exit(1)
})
