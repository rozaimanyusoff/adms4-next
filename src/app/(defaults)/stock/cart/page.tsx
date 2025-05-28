import CCart from "@components/stockinventory/c-cart";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Cart",
};

const Cart = () => {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Item Cart</h1>
      <CCart />
    </div>
  );
}
export default Cart;