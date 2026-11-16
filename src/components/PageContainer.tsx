interface PageContainerProps {
  children: React.ReactNode;
}

export default function PageContainer({ children }: PageContainerProps) {
  return (
    <div className="w-full mx-auto p-2 sm:p-4 space-y-6 animate-fade-in">
      {children}
    </div>
  );
}
