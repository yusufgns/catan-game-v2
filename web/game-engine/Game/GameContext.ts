let _instance: any = null;

export function getGameContext(): any {
  if (!_instance) throw new Error('Game not initialized');
  return _instance;
}

export function setGameContext(ctx: any) {
  _instance = ctx;
}
