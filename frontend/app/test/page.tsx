import Header from "@/components/Header";

export default function TestPage() {
    return (
        <main className="min-h-screen bg-[#050505] text-white pt-24">
            <Header />
            <div className="max-w-4xl mx-auto p-8">
                <h1 className="text-4xl font-bold mb-6">Test Page</h1>
                <p className="text-gray-400 text-lg">
                    This is a test page to verify the Header component.
                </p>

                <div className="mt-12 p-8 rounded-2xl bg-white/5 border border-white/10">
                    <h2 className="text-2xl font-semibold mb-4">Header Features:</h2>
                    <ul className="list-disc list-inside space-y-2 text-gray-300">
                        <li>Glassmorphism effect with backdrop blur</li>
                        <li>Responsive padding and alignment</li>
                        <li>Animated gradient "Connect Wallet" button</li>
                        <li>Gradient text logo</li>
                        <li>Fixed positioning</li>
                    </ul>
                </div>
            </div>
        </main>
    );
}
