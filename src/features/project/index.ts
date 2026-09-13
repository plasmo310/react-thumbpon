/** この feature の公開面。外からはここだけを見る */
export { Header } from './components/Header'
export { WorkspaceNotice } from './components/WorkspaceNotice'
export { restoreWorkspace, startAutoSave } from './lib/workspace'
export { reloadProjectFolder, saveProjectFolder } from './lib/projectFolder'
export { confirmFolderOverwrite } from './lib/confirmOverwrite'
