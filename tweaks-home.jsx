/* Tweaks for the hi-fi EAP Commons home. Writes values onto <html> as CSS
   variables / data-attributes; the page styles read them. Defaults keep it
   pure monochrome dark. */

const HOME_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#f5f5f4",
  "corners": "soft",
  "density": "comfortable"
}/*EDITMODE-END*/;

function applyHome(t) {
  const r = document.documentElement;
  const mono = t.accent.toLowerCase() === '#f5f5f4';
  r.style.setProperty('--accent', t.accent);
  r.style.setProperty('--accent-ink', mono ? '#0a0a0b' : '#ffffff');
  r.dataset.corners = t.corners;
  r.dataset.density = t.density;
}

function HomeTweaks() {
  const [t, setTweak] = useTweaks(HOME_DEFAULTS);
  React.useEffect(() => { applyHome(t); }, [t]);
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Accent" />
      <TweakColor label="Highlight" value={t.accent}
        options={['#f5f5f4', '#5b8cff', '#e0a82e', '#46b15e', '#e0573e']}
        onChange={v => setTweak('accent', v)} />
      <TweakSection label="Shape" />
      <TweakRadio label="Corners" value={t.corners}
        options={['sharp', 'soft', 'round']}
        onChange={v => setTweak('corners', v)} />
      <TweakSection label="Layout" />
      <TweakRadio label="Density" value={t.density}
        options={[{ value: 'compact', label: 'compact' }, { value: 'comfortable', label: 'comfy' }]}
        onChange={v => setTweak('density', v)} />
    </TweaksPanel>
  );
}

applyHome(HOME_DEFAULTS);
ReactDOM.createRoot(document.getElementById('tweaks-root')).render(<HomeTweaks />);
