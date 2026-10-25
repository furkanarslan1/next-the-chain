"use client";

import { LuInfo } from "react-icons/lu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Props = { weekly: number; left: number };

export function JokerInfo({ weekly, left }: Props) {
  return (
    <Dialog>
      <DialogTrigger
        aria-label="Joker hakkında bilgi"
        className="-m-2 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <LuInfo className="size-4" aria-hidden />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Joker nedir?</DialogTitle>
          <DialogDescription>
            Bir günü kaçırdığında zincirinin kırılmasını önleyen haktır.
          </DialogDescription>
        </DialogHeader>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            <span className="text-foreground">Kendiliğinden kullanılır.</span>{" "}
            Basman gereken bir buton yok. Bir günü tamamlamazsan, ertesi gün
            uygulamayı açtığında o gün için bir joker otomatik harcanır.
          </li>
          <li>
            Her zincirin haftada <b className="text-foreground">{weekly}</b>{" "}
            jokeri var ve her Pazartesi yenilenir. Bu hafta{" "}
            <b className="text-foreground">{left}</b> hakkın kaldı.
          </li>
          <li>
            Joker yeni halka eklemez, sadece zinciri korur.
          </li>
          <li>
            Hakların bittiği bir günü kaçırırsan zincirin sıfırlanır. Toplam
            halka sayın düşmez.
          </li>
        </ul>
      </DialogContent>
    </Dialog>
  );
}
