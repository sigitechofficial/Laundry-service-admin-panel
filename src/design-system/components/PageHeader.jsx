export default function PageHeader({ title, description, actions }) {
  return (
    <div className="jd-page-h">
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="jd-page-h__actions">{actions}</div> : null}
    </div>
  );
}
