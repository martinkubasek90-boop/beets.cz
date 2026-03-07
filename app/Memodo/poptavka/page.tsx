"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const interestOptions = [
  { value: "panely", label: "Solární panely" },
  { value: "stridace", label: "Střídače" },
  { value: "baterie", label: "Bateriová úložiště" },
  { value: "ems", label: "EMS - Energetický management" },
  { value: "montazni_systemy", label: "Montážní systémy" },
  { value: "nabijeci_stanice", label: "Nabíjecí stanice" },
  { value: "tepelna_cerpadla", label: "Tepelná čerpadla" },
  { value: "prislusenstvi", label: "Příslušenství" },
  { value: "kompletni_sestava", label: "Kompletní sestava" },
];

type FormState = {
  contact_name: string;
  company: string;
  email: string;
  phone: string;
  product_interest: string;
  message: string;
  estimated_quantity: string;
  product_id: string;
};

export default function MemodoInquiryPage() {
  const searchParams = useSearchParams();
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState<FormState>({
    contact_name: "",
    company: "",
    email: "",
    phone: "",
    product_interest: "",
    message: "",
    estimated_quantity: "",
    product_id: searchParams.get("product") || "",
  });

  const setField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    setSending(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-black">Odesláno!</h2>
        <p className="mt-3 max-w-xs text-sm text-gray-500">
          Vaše poptávka byla odeslána. Ozveme se vám co nejdříve s cenovou nabídkou.
        </p>
        <Button
          onClick={() => {
            setForm({
              contact_name: "",
              company: "",
              email: "",
              phone: "",
              product_interest: "",
              message: "",
              estimated_quantity: "",
              product_id: "",
            });
            setSubmitted(false);
          }}
          className="mt-8 rounded-xl bg-[#FFE500] px-10 py-5 font-bold text-black hover:bg-yellow-400"
        >
          Nová poptávka
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight">Poptávkový formulář</h1>
        <p className="mt-1 text-sm text-gray-500">Vyplňte formulář a my vám připravíme nabídku na míru.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Jméno a příjmení *</Label>
          <Input
            required
            value={form.contact_name}
            onChange={(e) => setField("contact_name", e.target.value)}
            placeholder="Jan Novák"
            className="h-12 rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Firma</Label>
          <Input
            value={form.company}
            onChange={(e) => setField("company", e.target.value)}
            placeholder="Název firmy s.r.o."
            className="h-12 rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">E-mail *</Label>
          <Input
            required
            type="email"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            placeholder="jan@firma.cz"
            className="h-12 rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Telefon</Label>
          <Input
            value={form.phone}
            onChange={(e) => setField("phone", e.target.value)}
            placeholder="+420 123 456 789"
            className="h-12 rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Oblast zájmu *</Label>
          <select
            required
            value={form.product_interest}
            onChange={(e) => setField("product_interest", e.target.value)}
            className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm"
          >
            <option value="">Vyberte kategorii produktů</option>
            {interestOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Odhadované množství (ks)</Label>
          <Input
            type="number"
            value={form.estimated_quantity}
            onChange={(e) => setField("estimated_quantity", e.target.value)}
            placeholder="např. 50"
            className="h-12 rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Zpráva / popis poptávky *</Label>
          <Textarea
            required
            value={form.message}
            onChange={(e) => setField("message", e.target.value)}
            placeholder="Popište co potřebujete - projekt, lokalita, výkon..."
            className="min-h-[120px] resize-none rounded-xl"
          />
        </div>

        <Button
          type="submit"
          disabled={sending}
          className="mt-4 w-full rounded-xl bg-[#FFE500] py-6 text-base font-black text-black shadow-lg shadow-yellow-500/20 hover:bg-yellow-400"
        >
          {sending ? "Odesílám..." : <><Send className="mr-2 h-5 w-5" /> Odeslat poptávku</>}
        </Button>
        <p className="pb-4 text-center text-xs text-gray-400">
          Odesláním souhlasíte se zpracováním osobních údajů.
        </p>
      </form>
    </div>
  );
}

