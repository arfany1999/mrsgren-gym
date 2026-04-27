import React from "react";
import styles from "./Card.module.css";

type Variant = "default" | "gold" | "flat";
type Pad = "default" | "tight" | "flush";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  pad?: Pad;
  as?: "div" | "section" | "article";
}

export function Card({
  variant = "default",
  pad = "default",
  as: Tag = "div",
  className = "",
  children,
  ...rest
}: CardProps) {
  const cls = [
    styles.card,
    variant === "gold" && styles.gold,
    variant === "flat" && styles.flat,
    pad === "tight" && styles.tight,
    pad === "flush" && styles.flush,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag className={cls} {...rest}>
      {children}
    </Tag>
  );
}

Card.Title = function CardTitle({ className = "", ...rest }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={`${styles.title} ${className}`} {...rest} />;
};

Card.Subtitle = function CardSubtitle({ className = "", ...rest }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`${styles.subtitle} ${className}`} {...rest} />;
};
