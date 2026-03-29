import { Card, CardContent } from '@/components/ui/card'

export function Demo() {
  return (
    <section className="py-24 px-4 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            See It In Action
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Watch how easily you can build complex applications with just a description.
          </p>
        </div>
        
        <Card className="overflow-hidden border-0 shadow-2xl">
          <CardContent className="p-0">
            <div className="relative aspect-video">
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/8GXGHYc6nxU"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
