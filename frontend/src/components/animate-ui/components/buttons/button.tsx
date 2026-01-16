"use client";

import * as React from "react";

import {
  Button as ButtonPrimitive,
  type ButtonProps as ButtonPrimitiveProps,
} from "@/components/animate-ui/primitives/buttons/button";
import { buttonVariants, type ButtonVariants } from "./button-variants";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonPrimitiveProps & ButtonVariants;

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button };
