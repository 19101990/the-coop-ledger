interface PageContainerProps {
  children: React.ReactNode;
}

export default function PageContainer({ children }: PageContainerProps) {
  return (
    <div className="w-full mx-auto py-2 sm:py-4 space-y-6 animate-fade-in">
      {children}
    </div>
  );
}
