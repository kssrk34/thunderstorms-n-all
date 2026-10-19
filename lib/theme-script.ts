export const THEME_KEY = "tna-theme";

/**
 * Runs before first paint so there is never a flash of the wrong theme.
 * Dark is the default; light and "follow the system" are options in Settings.
 * It also applies the per-device "decorative effects off" choice.
 */
export const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem('${THEME_KEY}')||'dark';var d=p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);var x=JSON.parse(localStorage.getItem('tna-device')||'{}');if(x.effects===false)document.documentElement.classList.add('fx-off');}catch(e){document.documentElement.classList.add('dark');}})();`;
