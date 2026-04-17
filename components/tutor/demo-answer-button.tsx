"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type DemoAnswerButtonProps = {
  answer: string;
};

export function DemoAnswerButton({ answer }: DemoAnswerButtonProps) {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <div className="space-y-2">
      <Button type="button" variant="secondary" onClick={() => setShowAnswer(true)}>
        Demo answer
      </Button>
      {showAnswer ? (
        <div className="rounded-xl border border-sky-400/40 bg-sky-500/10 p-3 text-sm text-sky-100">
          <p className="font-medium text-sky-50">Answer</p>
          <p className="mt-1">{answer}</p>
        </div>
      ) : null}
    </div>
  );
}