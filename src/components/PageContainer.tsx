interface PageContainerProps {
  children: React.ReactNode;
}

/** Vertical stack for a tab's sections. Horizontal padding comes from <main> in App.tsx. */
export default function PageContainer({ children }: PageContainerProps) {
  return <div className="flex w-full flex-col gap-6">{children}</div>;
}
