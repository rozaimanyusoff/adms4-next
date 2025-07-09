import React, { useRef, useState } from 'react';
import Tesseract from 'tesseract.js';
import { Input } from '@components/ui/input';
import { Button } from '@components/ui/button';

const CARD_REGEX = /\b(?:\d[ -]*?){13,19}\b/;

const CardNumberExtractor = () => {
    const [image, setImage] = useState<string | null>(null);
    const [cardNumber, setCardNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImage(URL.createObjectURL(e.target.files[0]));
            extractCardNumber(e.target.files[0]);
        }
    };

    const extractCardNumber = async (file: File) => {
        setLoading(true);
        setError('');
        setCardNumber('');
        try {
            const { data: { text } } = await Tesseract.recognize(file, 'eng');
            const match = text.match(CARD_REGEX);
            if (match) {
                setCardNumber(match[0].replace(/\D/g, ''));
            } else {
                setError('No card number found.');
            }
        } catch (err) {
            setError('Failed to extract card number.');
        }
        setLoading(false);
    };

    return (
        <div className="p-4 border rounded max-w-md mx-auto">
            <h2 className="text-lg font-bold mb-2">Extract Card Number from Image</h2>
            <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageChange}
                className="mb-2"
            />
            {image && <img src={image} alt="Uploaded" className="mb-2 max-h-48" />}
            {loading && <div>Processing...</div>}
            {cardNumber && (
                <div className="mt-2 text-green-600">Card Number: {cardNumber}</div>
            )}
            {error && <div className="mt-2 text-red-600">{error}</div>}
        </div>
    );
};

export default CardNumberExtractor;
