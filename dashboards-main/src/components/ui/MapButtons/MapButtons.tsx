import { useMap } from 'react-leaflet';
import styles from './MapButtons.module.css';

export const MapButtons = () => {
  const map = useMap();

  const zoomIn = () => {
    map.zoomIn();
  };

  const zoomOut = () => {
    map.zoomOut();
  };

  return (
    <div className={styles.container}>
      <button
        className={styles.mapBtn}
        title="Acercar"
        aria-label="Acercar"
        onClick={zoomIn}
      >
        <span className="material-symbols-outlined">add</span>
      </button>
      <button
        className={styles.mapBtn}
        title="Alejar"
        aria-label="Alejar"
        onClick={zoomOut}
      >
        <span className="material-symbols-outlined">remove</span>
      </button>
    </div>
  );
};
