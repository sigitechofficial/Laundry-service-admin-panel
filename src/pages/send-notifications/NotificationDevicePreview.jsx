import styles from "./SendNotifications.module.css";

function nowClock() {
  const d = new Date();
  return {
    time: d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    date: d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }),
  };
}

function NotificationCard({ title, body, imageUrl, variant }) {
  const isApp = variant === "app";
  return (
    <article className={isApp ? styles.appCard : styles.lockCard}>
      <div className={styles.icon} aria-hidden>
        JD
      </div>
      <div>
        <div className={styles.cardMeta}>
          <span>Just Dry Cleans</span>
          <span>now</span>
        </div>
        <h3 className={styles.cardTitle}>{title || "Untitled"}</h3>
        {body ? <p className={styles.cardBody}>{body}</p> : null}
      </div>
      {imageUrl ? (
        <img className={styles.cardImage} src={imageUrl} alt="" />
      ) : null}
    </article>
  );
}

export default function NotificationDevicePreview({ title, body, imageUrl }) {
  const hasContent = Boolean(String(title || "").trim() || String(body || "").trim());
  const clock = nowClock();

  return (
    <div className={styles.phone} aria-label="Live notification preview">
      <div className={styles.screen}>
        <div className={styles.island} aria-hidden />
        <div className={styles.status}>
          <span>{clock.time}</span>
          <span className={styles.statusIcons} aria-hidden>
            <span>●●●</span>
            <span>5G</span>
          </span>
        </div>
        <div className={styles.lockTime}>
          <div className={styles.lockClock}>{clock.time}</div>
          <div className={styles.lockDate}>{clock.date}</div>
        </div>

        {!hasContent ? (
          <div className={styles.empty}>Your notification will appear here</div>
        ) : (
          <div className={styles.cards}>
            <div className={styles.kicker}>Lock screen</div>
            <NotificationCard
              title={title}
              body={body}
              imageUrl={imageUrl}
              variant="lock"
            />
            <div className={styles.appWrap}>
              <div className={styles.kicker}>In-app</div>
              <NotificationCard
                title={title}
                body={body}
                imageUrl={imageUrl}
                variant="app"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
