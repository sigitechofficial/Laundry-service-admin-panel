import { Children, cloneElement, isValidElement, useId } from "react";

export default function Field({ label, hint, error, htmlFor, children }) {
  const uid = useId();
  const first = Children.toArray(children).find(isValidElement);
  const controlId = htmlFor || first?.props?.id || `${uid}-ctrl`;
  const hintId = `${uid}-hint`;
  const errId = `${uid}-err`;
  const describedBy = [error ? errId : null, !error && hint ? hintId : null]
    .filter(Boolean)
    .join(" ") || undefined;

  const content = Children.map(children, (child, index) => {
    if (!isValidElement(child) || index > 0) return child;
    const next = {};
    const isNativeWrap = child.type === "div" || child.type === "span";
    if (!child.props.id && !isNativeWrap) next.id = controlId;
    if (describedBy && !child.props["aria-describedby"]) next["aria-describedby"] = describedBy;
    if (error && child.props["aria-invalid"] == null) next["aria-invalid"] = true;
    return Object.keys(next).length ? cloneElement(child, next) : child;
  });

  return (
    <div className="jd-field">
      {label ? (
        <label className="jd-field__label" htmlFor={controlId}>
          {label}
        </label>
      ) : null}
      {content}
      {error ? (
        <span className="jd-field__err" id={errId}>
          {error}
        </span>
      ) : null}
      {!error && hint ? (
        <span className="jd-field__hint" id={hintId}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}
