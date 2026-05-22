export default function LiquidGlassDemo() {
  return (
    <div className="min-h-screen bg-dark-bg p-8">
      {/* Header */}
      <div className="mb-12">
        <h1 className="liquid-text-gradient text-4xl font-bold mb-2">Liquid Glass Effects</h1>
        <p className="text-light-secondary">Advanced glassmorphism with fluid animations</p>
      </div>

      {/* Demo Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Basic Liquid Glass Card */}
        <div className="liquid-glass p-6 rounded-xl">
          <h3 className="text-light-primary font-semibold mb-2">Basic Liquid Glass</h3>
          <p className="text-light-secondary text-sm">Clean glassmorphism with subtle gradient overlay</p>
        </div>

        {/* Interactive Liquid Glass */}
        <div className="liquid-glass-interactive p-6 rounded-xl">
          <h3 className="text-light-primary font-semibold mb-2">Interactive Glass</h3>
          <p className="text-light-secondary text-sm">Hover to see the glass respond with glow</p>
        </div>

        {/* Liquid Blob Card */}
        <div className="liquid-blob p-6 rounded-full aspect-square flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-light-primary font-semibold mb-2">Liquid Blob</h3>
            <p className="text-light-secondary text-xs">Morphing shape animation</p>
          </div>
        </div>

        {/* Liquid Card with Button */}
        <div className="liquid-card rounded-xl">
          <h3 className="text-light-primary font-semibold mb-3">Features</h3>
          <ul className="space-y-2 mb-4">
            <li className="text-light-secondary text-sm flex items-center">
              <span className="w-2 h-2 bg-clean-tech-accent-blue rounded-full mr-2"></span>
              Smooth animations
            </li>
            <li className="text-light-secondary text-sm flex items-center">
              <span className="w-2 h-2 bg-clean-tech-accent-cyan rounded-full mr-2"></span>
              Backdrop blur effect
            </li>
            <li className="text-light-secondary text-sm flex items-center">
              <span className="w-2 h-2 bg-clean-tech-accent-purple rounded-full mr-2"></span>
              Gradient overlays
            </li>
          </ul>
          <button className="liquid-button w-full text-sm">Learn More</button>
        </div>

        {/* Liquid Flow Background */}
        <div className="liquid-flow-bg liquid-glass p-6 rounded-xl">
          <h3 className="text-light-primary font-semibold mb-2">Liquid Flow</h3>
          <p className="text-light-secondary text-sm">Dynamic gradient animation</p>
        </div>

        {/* Liquid Shimmer */}
        <div className="liquid-shimmer liquid-glass p-6 rounded-xl">
          <h3 className="text-light-primary font-semibold mb-2">Shimmer Effect</h3>
          <p className="text-light-secondary text-sm">Light sweep animation overlay</p>
        </div>

        {/* Input Example */}
        <div className="md:col-span-2 lg:col-span-3">
          <label className="block text-light-secondary text-sm mb-2">Liquid Glass Input</label>
          <input
            type="text"
            placeholder="Click to interact with the liquid glass input..."
            className="liquid-input"
          />
        </div>
      </div>

      {/* Button Showcase */}
      <div className="mt-12">
        <h2 className="text-light-primary text-2xl font-bold mb-6">Button Variants</h2>
        <div className="flex flex-wrap gap-4">
          <button className="liquid-button">Default</button>
          <button className="liquid-button opacity-75">Secondary</button>
          <button className="liquid-button text-clean-tech-accent-cyan">Accent</button>
        </div>
      </div>

      {/* Divider */}
      <div className="my-12">
        <div className="liquid-divider"></div>
      </div>

      {/* Info Card */}
      <div className="liquid-glass p-8 rounded-2xl max-w-2xl">
        <h3 className="liquid-text-gradient text-xl font-bold mb-4">About Liquid Glass</h3>
        <p className="text-light-secondary mb-4">
          Liquid Glass is an advanced UI design technique that combines glassmorphism with fluid animations.
          It creates a sense of depth and interactivity while maintaining visual clarity.
        </p>
        <p className="text-light-secondary text-sm">
          Features include backdrop blur, gradient overlays, smooth transitions, and morphing animations
          that respond to user interaction.
        </p>
      </div>
    </div>
  );
}
