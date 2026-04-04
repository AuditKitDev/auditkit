interface FAQ {
  question: string;
  answer: string;
}

export function FAQSection({ faqs, title = 'Frequently asked questions' }: { faqs: FAQ[]; title?: string }) {
  return (
    <section className="max-w-4xl mx-auto px-6 pb-20">
      <h2 className="text-3xl font-extrabold tracking-tight mb-8">{title}</h2>
      <div className="grid gap-5">
        {faqs.map((faq) => (
          <div key={faq.question} className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-bold mb-3">{faq.question}</h3>
            <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
