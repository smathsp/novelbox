import { WorkspaceError } from '../errors/workspaceError';

export class WorkspaceService {
  static getWorkspacePath(): string {
    const workspacePath = localStorage.getItem('workspacePath');
    if (!workspacePath) {
      throw new WorkspaceError('工作区路径读取失败，请重启程序');
    }
    return workspacePath;
  }
}
