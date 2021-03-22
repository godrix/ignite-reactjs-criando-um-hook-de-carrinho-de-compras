import { createContext, ReactNode, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  useEffect(() => {
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
  }, [cart]);

  const addProduct = async (productId: number) => {
    try {
      const responseProduct = await api.get<Product>(`/products/${productId}`);
      const responseStock = await api.get<Stock>(`/stock/${productId}`);

      if (responseStock.data.amount < 1) {
        throw new Error("Quantidade solicitada fora de estoque");
      }

      const isRepet = cart.find(item => item.id === productId);

      if (!!isRepet) {
        const moreItems = cart.map(item => {
          if (item.id === productId) {
            return {
              ...item,
              amount: item.amount + 1
            }
          } else {
            return item
          }
        });
        setCart(moreItems)
      } else {
        setCart([...cart, responseProduct.data])
      }
    } catch (err) {
      toast.error(err);
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const removedItem = cart.filter(item => item.id !== productId);
      setCart(removedItem)
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const productUpdate = cart.find(item => item.id)
      if (!(!!productUpdate?.amount)) {
        return
      }
      const isStock = await api.get<Stock>(`/stock/${productId}`);
      if (isStock.data.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      const update = cart.map(item => {
        if (item.id === productId) {
          return {
            ...item,
            amount: item.amount + amount
          }
        } else {
          return item;
        }
      })

      setCart(update)



    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
