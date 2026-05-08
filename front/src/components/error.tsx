interface ErrorProps {
    message?: string | string[];
}

export default function Error({ message } : ErrorProps) {
    if (!message) return null;
    const display = Array.isArray(message) ? message[0] : [message];

    return (
        <span className="mt-1 text-sm text-[#7A003C]">{display}</span>
    );
};