import { ArrowLeft, Scan, ZoomIn, ZoomOut } from 'lucide-react';
import { goMenu } from '../../game/actions';
import { useGame } from '../../game/store';
import { useT } from '../../i18n/i18n';
import { levelNumber } from '../../levels/catalog';
import { cameraRig, ZOOM } from '../../scene/cameraRig';
import { button, PILL } from '../classes';

export function TopBar() {
  const level = useGame((s) => s.level);
  const mode = useGame((s) => s.mode);
  const tr = useT();
  if (!level) return null;
  return (
    <div className="pointer-events-none! flex animate-slide-in items-center" data-frame data-topbar>
      <div className={`${PILL} pointer-events-auto min-w-0 gap-1`} data-pill>
        <button
          className={`${button('quiet', 'none')} size-7.5`}
          title={mode === 'tutorial' ? tr.topBar.home : tr.topBar.allLevels}
          aria-label={mode === 'tutorial' ? tr.topBar.home : tr.topBar.allLevels}
          onClick={() => goMenu(mode === 'tutorial' ? 'home' : 'levels')}
        >
          <ArrowLeft size={15} strokeWidth={2.4} />
        </button>
        <div className="min-w-0 truncate pr-3 pl-0.5 font-display text-base font-semibold">
          {mode === 'level' && <span className="text-faint">{levelNumber(level.id)}. </span>}
          {level.title}
        </div>
      </div>
      <span className="flex-1" />
      <ViewControl />
    </div>
  );
}

function ViewControl() {
  const tr = useT().view;
  const icon = `${button('quiet', 'none')} size-7.5`;
  return (
    <div className={`${PILL} pointer-events-auto gap-0.5`}>
      <button className={icon} title={tr.zoomIn} aria-label={tr.zoomIn} onClick={() => cameraRig.zoomBy(1 / ZOOM)}>
        <ZoomIn size={16} strokeWidth={2.2} />
      </button>
      <button className={icon} title={tr.zoomOut} aria-label={tr.zoomOut} onClick={() => cameraRig.zoomBy(ZOOM)}>
        <ZoomOut size={16} strokeWidth={2.2} />
      </button>
      <button className={icon} title={tr.reset} aria-label={tr.reset} onClick={cameraRig.resetView}>
        <Scan size={16} strokeWidth={2.2} />
      </button>
    </div>
  );
}
