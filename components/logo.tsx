export type LogoStyle = 'e2b' | 'fragments'

export default function Logo({
  style = 'fragments',
  className,
  ...props
}: { style?: LogoStyle; className?: string } & React.ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      src="/logo.png"
      alt="WorkersCraft AI"
      className={className}
      {...props}
    />
  )
}
