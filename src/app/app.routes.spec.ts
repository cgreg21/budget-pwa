import { routes } from './app.routes';

describe('routes', () => {
  it('lazy-loads the shell and every page', async () => {
    expect(routes).toHaveLength(1);
    const [shell] = routes;
    expect(shell.path).toBe('');
    const children = shell.children ?? [];
    expect(children.map((route) => route.path)).toEqual([
      '', 'budget', 'categories', 'stats', 'history', 'trash', 'settings', 'settings/recurrences', '**',
    ]);
    expect(children[0]).toMatchObject({ pathMatch: 'full', redirectTo: 'budget' });
    expect(children.at(-1)).toMatchObject({ redirectTo: 'budget' });
    const loaders = [shell, ...children].flatMap((route) => (route.loadComponent ? [route.loadComponent] : []));
    expect(loaders).toHaveLength(8);
    const components = await Promise.all(loaders.map((load) => load()));
    for (const component of components) expect(typeof component).toBe('function');
    expect(new Set(components).size).toBe(8);
  });
});
