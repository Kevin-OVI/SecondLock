import { HTMLAttributes, ReactNode } from "react";
import { useEffect, useRef } from "react";

export interface LocalMenuProps {
  hideCallback: () => void;
  children?: ReactNode;
}

export default function LocalMenu({ hideCallback, children, ...props }: LocalMenuProps & HTMLAttributes<HTMLDivElement>) {
  let ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: any) {
      if (ref.current && !ref.current.contains(event.target)) {
        hideCallback();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [hideCallback]);

  return (
    <div ref={ref} {...props}>
      {children}
    </div>
  );
}
