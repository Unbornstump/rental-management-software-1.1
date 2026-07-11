// Premium 3D Isometric Empty State Illustrations
// Cohesive family of minimalist illustrations for Properties, Units, and Tenants

const EmptyStateIllustrations = {
  // Properties: A beautifully designed apartment building standing alone
  // Symbolizes the beginning of the user's rental portfolio
  properties: `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="empty-state-illustration">
      <defs>
        <linearGradient id="building-front-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f8f9fa;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#e9ecef;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="building-side-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#dee2e6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#ced4da;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="building-top-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#f8f9fa;stop-opacity:1" />
        </linearGradient>
        <filter id="soft-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.08"/>
        </filter>
      </defs>
      
      <!-- Ground shadow -->
      <ellipse cx="100" cy="165" rx="60" ry="20" fill="#000000" opacity="0.06"/>
      
      <!-- Building - Isometric view -->
      <g filter="url(#soft-shadow)">
        <!-- Left face -->
        <path d="M60 70 L60 140 L100 160 L100 90 Z" fill="url(#building-side-grad)" stroke="#adb5bd" stroke-width="0.5"/>
        
        <!-- Right face -->
        <path d="M100 90 L100 160 L140 140 L140 70 Z" fill="url(#building-front-grad)" stroke="#adb5bd" stroke-width="0.5"/>
        
        <!-- Top face -->
        <path d="M60 70 L100 50 L140 70 L100 90 Z" fill="url(#building-top-grad)" stroke="#adb5bd" stroke-width="0.5"/>
      </g>
      
      <!-- Windows - Left face -->
      <g fill="#ffffff" stroke="#dee2e6" stroke-width="0.5">
        <rect x="68" y="85" width="16" height="20" rx="2"/>
        <rect x="68" y="110" width="16" height="20" rx="2"/>
      </g>
      
      <!-- Windows - Right face -->
      <g fill="#ffffff" stroke="#dee2e6" stroke-width="0.5">
        <rect x="110" y="85" width="16" height="20" rx="2"/>
        <rect x="110" y="110" width="16" height="20" rx="2"/>
      </g>
      
      <!-- Window details - subtle gold accent -->
      <g fill="#d4af37" opacity="0.3">
        <rect x="75" y="90" width="2" height="10"/>
        <rect x="75" y="115" width="2" height="10"/>
        <rect x="117" y="90" width="2" height="10"/>
        <rect x="117" y="115" width="2" height="10"/>
      </g>
      
      <!-- Door - Right face -->
      <rect x="115" y="125" width="12" height="18" rx="1" fill="#ffffff" stroke="#dee2e6" stroke-width="0.5"/>
      <circle cx="125" cy="134" r="1.5" fill="#d4af37" opacity="0.5"/>
    </svg>
  `,

  // Units: Cutaway structure with visible empty rooms
  // Property created, ready to be organized into rentable spaces
  units: `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="empty-state-illustration">
      <defs>
        <linearGradient id="unit-front-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f8f9fa;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#e9ecef;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="unit-side-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#dee2e6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#ced4da;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="unit-top-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#f8f9fa;stop-opacity:1" />
        </linearGradient>
        <filter id="soft-shadow2" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.08"/>
        </filter>
      </defs>
      
      <!-- Ground shadow -->
      <ellipse cx="100" cy="165" rx="60" ry="20" fill="#000000" opacity="0.06"/>
      
      <!-- Building with cutaway - Isometric view -->
      <g filter="url(#soft-shadow2)">
        <!-- Left face - partially open -->
        <path d="M60 70 L60 140 L100 160 L100 90 Z" fill="url(#unit-side-grad)" stroke="#adb5bd" stroke-width="0.5"/>
        
        <!-- Right face - partially open -->
        <path d="M100 90 L100 160 L140 140 L140 70 Z" fill="url(#unit-front-grad)" stroke="#adb5bd" stroke-width="0.5"/>
        
        <!-- Top face -->
        <path d="M60 70 L100 50 L140 70 L100 90 Z" fill="url(#unit-top-grad)" stroke="#adb5bd" stroke-width="0.5"/>
      </g>
      
      <!-- Cutaway opening - Left face -->
      <path d="M70 80 L70 130 L90 140 L90 90 Z" fill="#ffffff" stroke="#dee2e6" stroke-width="0.5"/>
      
      <!-- Cutaway opening - Right face -->
      <path d="M110 90 L110 140 L130 130 L130 80 Z" fill="#ffffff" stroke="#dee2e6" stroke-width="0.5"/>
      
      <!-- Room dividers - subtle lines -->
      <g stroke="#dee2e6" stroke-width="1" opacity="0.6">
        <line x1="80" y1="85" x2="80" y2="135"/>
        <line x1="120" y1="85" x2="120" y2="135"/>
      </g>
      
      <!-- Empty room indicators - subtle gold dots -->
      <g fill="#d4af37" opacity="0.4">
        <circle cx="75" cy="105" r="2"/>
        <circle cx="85" cy="105" r="2"/>
        <circle cx="115" cy="105" r="2"/>
        <circle cx="125" cy="105" r="2"/>
      </g>
      
      <!-- Window frames -->
      <g fill="#ffffff" stroke="#dee2e6" stroke-width="0.5">
        <rect x="95" y="85" width="10" height="15" rx="1"/>
      </g>
    </svg>
  `,

  // Tenants: Building entrance with welcoming doorway
  // Units waiting to be occupied
  tenants: `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="empty-state-illustration">
      <defs>
        <linearGradient id="tenant-front-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f8f9fa;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#e9ecef;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="tenant-side-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#dee2e6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#ced4da;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="tenant-top-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#f8f9fa;stop-opacity:1" />
        </linearGradient>
        <filter id="soft-shadow3" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.08"/>
        </filter>
        <linearGradient id="door-glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#d4af37;stop-opacity:0.15" />
          <stop offset="100%" style="stop-color:#d4af37;stop-opacity:0.05" />
        </linearGradient>
      </defs>
      
      <!-- Ground shadow -->
      <ellipse cx="100" cy="165" rx="60" ry="20" fill="#000000" opacity="0.06"/>
      
      <!-- Building - Isometric view -->
      <g filter="url(#soft-shadow3)">
        <!-- Left face -->
        <path d="M60 70 L60 140 L100 160 L100 90 Z" fill="url(#tenant-side-grad)" stroke="#adb5bd" stroke-width="0.5"/>
        
        <!-- Right face -->
        <path d="M100 90 L100 160 L140 140 L140 70 Z" fill="url(#tenant-front-grad)" stroke="#adb5bd" stroke-width="0.5"/>
        
        <!-- Top face -->
        <path d="M60 70 L100 50 L140 70 L100 90 Z" fill="url(#tenant-top-grad)" stroke="#adb5bd" stroke-width="0.5"/>
      </g>
      
      <!-- Windows - Left face -->
      <g fill="#ffffff" stroke="#dee2e6" stroke-width="0.5">
        <rect x="68" y="85" width="16" height="20" rx="2"/>
        <rect x="68" y="110" width="16" height="20" rx="2"/>
      </g>
      
      <!-- Windows - Right face -->
      <g fill="#ffffff" stroke="#dee2e6" stroke-width="0.5">
        <rect x="110" y="85" width="16" height="20" rx="2"/>
      </g>
      
      <!-- Welcoming doorway - Right face, prominent -->
      <rect x="112" y="115" width="20" height="30" rx="2" fill="url(#door-glow)" stroke="#d4af37" stroke-width="1" stroke-opacity="0.3"/>
      <rect x="114" y="117" width="16" height="26" rx="1" fill="#ffffff" stroke="#dee2e6" stroke-width="0.5"/>
      
      <!-- Door handle - gold accent -->
      <circle cx="127" cy="130" r="2" fill="#d4af37" opacity="0.6"/>
      
      <!-- Mailbox - subtle detail -->
      <rect x="65" y="145" width="12" height="8" rx="1" fill="#ffffff" stroke="#dee2e6" stroke-width="0.5"/>
      <rect x="67" y="147" width="8" height="4" rx="0.5" fill="#d4af37" opacity="0.2"/>
      
      <!-- Welcome mat - subtle -->
      <rect x="108" y="148" width="24" height="4" rx="0.5" fill="#d4af37" opacity="0.15"/>
      
      <!-- Subtle glow from doorway -->
      <ellipse cx="122" cy="145" rx="15" ry="5" fill="#d4af37" opacity="0.08"/>
    </svg>
  `
};
