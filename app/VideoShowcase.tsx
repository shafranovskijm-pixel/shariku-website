import styles from "./VideoShowcase.module.css";

const videos = [
  {src:"/videos/recent/video5409000221088722045.mp4", poster:"/images/recent/5409000221548683522.jpg", title:"Оформление на выписку из роддома"},
  {src:"/videos/recent/video5409000221088722048.mp4", poster:"/images/recent/5409000221548683523.jpg", title:"Воздушные шары для встречи малыша"},
];

export default function VideoShowcase() {
  return <section className={styles.section} aria-labelledby="video-works-title">
    <div className={styles.heading}><p className="eyebrow">Праздник в движении</p><h2 id="video-works-title">Видеопримеры оформления</h2><p>Посмотрите детали композиций в коротких видео из портфолио.</p></div>
    <div className={styles.grid}>{videos.map(video => <figure key={video.src}>
      <video controls playsInline preload="none" poster={video.poster} aria-label={video.title}>
        <source src={video.src} type="video/mp4" />
        Ваш браузер не поддерживает воспроизведение видео. <a href={video.src}>Открыть ролик</a>
      </video>
      <figcaption>{video.title}</figcaption>
    </figure>)}</div>
  </section>;
}
