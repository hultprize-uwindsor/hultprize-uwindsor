import { useEffect, useState } from 'react'
import {
  Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious,
  type CarouselApi,
} from '../lightswind/carousel'
import { Card, CardContent } from '../lightswind/card'
import './PhotoCarousel.css'

export type PhotoSlide = { src: string; alt: string; caption: string }

export default function PhotoCarousel({ slides }: { slides: PhotoSlide[] }) {
  const [api, setApi] = useState<CarouselApi>()
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    if (!api) return
    const update = () => setSelected(api.selectedScrollSnap())
    update()
    api.on('select', update)
    api.on('reInit', update)
    return () => { api.off('select', update); api.off('reInit', update) }
  }, [api])

  if (!slides.length) return null
  const current = Math.min(selected, slides.length - 1)

  return (
    <div className="lightswind-carousel">
      <div className="flex items-center justify-center py-12 w-full">
        <Carousel
          className="w-full max-w-xs relative"
          setApi={setApi}
          opts={{ breakpoints: { '(prefers-reduced-motion: reduce)': { duration: 0 } } }}
          aria-label="Hult Prize in pictures"
          tabIndex={0}
        >
          <CarouselContent data-photo-track>
            {slides.map((slide, index) => (
              <CarouselItem key={slide.src} aria-label={`${index + 1} of ${slides.length}`} aria-hidden={index !== current}>
                <div className="p-1">
                  <Card className="border border-zinc-200 dark:border-zinc-800">
                    <CardContent className="flex aspect-square items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                      <img
                        className="h-full w-full object-cover"
                        src={slide.src}
                        alt={slide.alt}
                        width="800"
                        height="800"
                        loading={Math.abs(index - current) <= 1 ? 'eager' : 'lazy'}
                        draggable={false}
                      />
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-left-12" />
          <CarouselNext className="-right-12" />
        </Carousel>
      </div>
      <div className="photo-carousel__footer" aria-live="polite" aria-atomic="true">
        <p className="photo-carousel__count">{current + 1} / {slides.length}</p>
      </div>
    </div>
  )
}
