// A system dependency the user installs: the run is recorded as failed, workflow.log and the page lead with
// what to install, and 继续 checks again and goes on.
export class MissingDependencyError extends Error {
  constructor(problem: string, hint: string, detail = '') {
    super(`${problem}${hint}安装完成后在网页点「继续」（命令行 --continue），会重新检查并接着运行；已有会话和产物保留。${detail}`);
    this.name = 'MissingDependencyError';
  }
}
