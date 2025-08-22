# License Plate Game - Project Documentation

## Project Overview

The License Plate Game is a web-based application that allows users to track license plates they’ve spotted from different US states, territories, and Canadian provinces. The game calculates distances from the user’s current location to each logged region and provides visual feedback through an interactive map with multiple themes.

## Core Requirements

### Functional Requirements

1. **Location Detection**: Automatically detect user’s current GPS coordinates
1. **Distance Calculation**: Calculate miles from user location to selected state/province borders
1. **Data Persistence**: Save logged plates in browser localStorage
1. **Visual Map**: Interactive map showing all regions with color-coded status
1. **Progress Tracking**: Show completion progress and total score
1. **Multiple Themes**: Support different visual themes for the map

### Non-Functional Requirements

1. **Cross-Platform**: Work on desktop and mobile browsers
1. **Offline Capability**: Function without constant internet (after initial load)
1. **Performance**: Handle 69 geographic regions efficiently
1. **Responsive Design**: Adapt to different screen sizes
1. **Accessibility**: Proper contrast and semantic markup

## Technical Architecture

### Technology Stack

- **Frontend**: Pure HTML5, CSS3, JavaScript (ES6+)
- **Mapping**: Leaflet.js for interactive maps
- **Geolocation**: Browser Navigator API with fallback strategies
- **Geocoding**: OpenStreetMap Nominatim API
- **Data Storage**: Browser localStorage
- **Geographic Data**: GeoJSON format for state/province boundaries

### Data Structure

#### Geographic Regions (69 total)

- **US States**: 50 states + District of Columbia (51 total)
- **US Territories**: 5 territories (American Samoa, CNMI, Guam, Puerto Rico, US Virgin Islands)
- **Canadian Regions**: 13 provinces and territories

#### Data Format

```json
{
  "geojson": {
    "type": "Polygon" | "MultiPolygon",
    "coordinates": [[[longitude, latitude], ...]]
  }
}
```

#### Storage Schema

```json
{
  "plateLog": {
    "state_name": {
      "location": "City, State",
      "miles": 1234
    }
  },
  "selectedTheme": "classic|random|flag",
  "randomColorAssignments": {
    "state_name": "#color"
  }
}
```

## Implementation Details

### Geolocation Strategy

#### Multi-Fallback Approach

1. **Strategy 1**: High accuracy, short timeout (mobile Safari: disabled high accuracy)
1. **Strategy 2**: Lower accuracy, longer timeout
1. **Strategy 3**: Accept cached position as last resort

#### Mobile Safari Optimizations

- Disabled high accuracy mode (frequently fails)
- Longer timeouts (15-25 seconds)
- Specific error handling for iOS permission issues
- Manual location input as fallback

### Distance Calculation

#### Algorithm: Haversine Formula

```javascript
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  // ... calculation ...
  return R * c * 0.621371; // Convert to miles
}
```

#### Process

1. Extract border points from GeoJSON coordinates
1. Find closest point to user location
1. Calculate great-circle distance
1. Convert kilometers to miles

### Coordinate System Handling

#### US States

- Format: WGS84 Geographic (EPSG:4326)
- Coordinate order: [longitude, latitude] in GeoJSON
- Processing: Swap to [latitude, longitude] for distance calculations

#### Canadian Provinces

- **Original Issue**: Projected coordinates (UTM/NAD83)
- **Solution**: Python conversion script using pyproj library
- **Target**: Convert to WGS84 Geographic matching US format

### Map Implementation

#### Base Map

- **Tile Source**: CartoDB Light (no labels)
- **Center**: [50.0, -100.0] (US-Canada geographic center)
- **Zoom Level**: 3 (continental view)
- **Controls**: Zoom, pan enabled

#### State Rendering

- **Batch Loading**: 8 states at a time with 150ms delays
- **Styling**: Dynamic based on current theme
- **Performance**: Cached GeoJSON, reused Leaflet layers

#### Map Recentering

- **Triggers**: After successful plate logging, after reset
- **Timing**: 500ms delay to allow UI updates
- **Target**: Return to geographic center view

## Visual Themes

### Theme 1: Classic

- **Logged States**: Green (#28a745)
- **Unlogged States**: Gray (#6a6a6a)
- **Features**: Legend displayed, consistent experience

### Theme 2: Random Colors

- **Color Palette**: Blue, Red, Green, Yellow, Purple, Orange
- **Assignment**: Persistent random per state (seeded by name)
- **Features**: No legend, visual variety

### Theme 3: Flag Colors

- **US Regions**: Red, White, Blue (with pattern variants)
  - Solid colors: Red, White, Blue
  - Patterns: Red/white stripes, Blue with white stars
  - Territories: Always blue
- **Canadian Regions**: Red, White (representing Canadian flag)
  - Random assignment: Red or white per province
- **Pattern Implementation**: SVG patterns for stripes and stars

### Color Assignment Logic

```javascript
function getFlagAssignment(regionName) {
  const seed = regionName.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  
  if (REMOTE_TERRITORIES.includes(regionName)) {
    return 'blue'; // All US territories
  } else if (CANADIAN_REGIONS.includes(regionName)) {
    return ['red', 'white'][seed % 2]; // Random red/white
  } else {
    return ['red', 'white', 'blue'][seed % 3]; // Random RGB
  }
}
```

## User Interface Design

### Layout Structure

- **Header**: Title, progress bar, theme selector
- **Controls**: State/province dropdown, submit/reset buttons
- **Main Area**: Split layout with map and territories sidebar
- **Footer**: Results table with logged plates

### Dropdown Organization

```
--Select--
-- United States --
  Alabama
  Alaska
  ...
  Wyoming
-- Territories --
  American Samoa
  ...
  US Virgin Islands
-- Canada --
  Alberta
  ...
  Yukon
```

### Responsive Design

- **Desktop**: Side-by-side map and sidebar
- **Mobile**: Stacked layout, full-width elements
- **Breakpoint**: 768px width

## Technical Challenges & Solutions

### Challenge 1: Canadian Coordinate System

- **Problem**: Manitoba showing 64 miles from Maryland (should be ~1,100)
- **Root Cause**: Canadian shapefiles in UTM projection vs US in geographic
- **Solution**: Python conversion script with pyproj library
- **Tools Used**: QGIS, GDAL, online converters

### Challenge 2: Mobile Safari Geolocation

- **Problem**: Frequent “position unavailable” errors
- **Root Cause**: iOS permission system, high accuracy failures
- **Solution**: Multiple fallback strategies, specific iOS handling
- **User Education**: Clear instructions for iOS settings

### Challenge 3: Map Performance

- **Problem**: Loading 69 regions simultaneously caused browser lag
- **Root Cause**: Too many simultaneous network requests and DOM updates
- **Solution**: Batch loading (8 at a time), request spacing, efficient caching

### Challenge 4: Theme State Management

- **Problem**: Color assignments not persisting between sessions
- **Root Cause**: Random colors regenerated on each page load
- **Solution**: localStorage persistence with collision detection

## File Structure

```
license-plate-game/
├── index.html              # Main application page
├── script.js               # Core application logic
├── state_jsons/            # Geographic data directory
│   ├── alabama.json        # Individual state files
│   ├── manitoba.json       # Canadian province files
│   └── ...
├── tools/                  # Development utilities
│   ├── split_canada.py     # Province file splitter
│   └── convert_coordinates.py # Coordinate system converter
└── docs/
    └── README.md           # This documentation
```

## Development Tools

### Python Utilities

#### split_canada.py

- **Purpose**: Split allCanada.json into individual province files
- **Features**: Handle multiple GeoJSON formats, normalize province names
- **Output**: Consistent format matching US state files

#### convert_coordinates.py

- **Purpose**: Convert Canadian shapefiles from projected to geographic coordinates
- **Dependencies**: pyproj library
- **Features**: Auto-detect coordinate systems, test multiple CRS options

### Debugging Approaches

- **Console Logging**: Extensive logging for geolocation and data loading
- **Test Coordinates**: Manual input for testing distance calculations
- **Incremental Loading**: Start with subset of states for debugging

## Future Enhancement Plans

### Near-Term Improvements

1. **Voice Integration**
- Siri Shortcuts for hands-free plate logging while driving
- “Add license plate [state]” voice commands
- Background location services integration
1. **Native Mobile Apps**
- iOS and Android applications
- Better geolocation performance
- Offline map caching
- Push notifications for challenges
1. **Enhanced Themes**
- Canadian flag patterns (red maple leaf designs)
- Regional color schemes (time zones, geographic regions)
- Seasonal themes
- User-customizable color palettes
1. **Gamification Features**
- Achievement badges
- Leaderboards
- Challenge modes (time-based, distance-based)
- Social sharing capabilities

### Long-Term Vision

1. **International Expansion**
- Mexico integration
- European countries
- Global license plate tracking
1. **Advanced Analytics**
- Travel pattern visualization
- Statistical analysis (rarest plates, average distances)
- Time-based tracking
- Route optimization suggestions
1. **Community Features**
- Photo uploads of license plates
- User-generated content
- Plate rarity ratings
- Community challenges
1. **Progressive Web App (PWA)**
- Offline functionality
- App-like installation
- Background sync
- Service worker caching

## Technical Debt & Known Issues

### Current Limitations

1. **Internet Dependency**: Requires connection for geocoding and initial map loading
1. **Browser Storage**: Limited to localStorage (no cloud sync)
1. **Single User**: No multi-user support or data sharing
1. **Manual Input**: No photo recognition or automatic plate detection

### Performance Considerations

1. **Memory Usage**: All GeoJSON data loaded into browser memory
1. **Network Requests**: Nominatim API rate limiting possible
1. **Mobile Performance**: Large geographic datasets on slower devices

### Security & Privacy

1. **Location Data**: Stored locally, not transmitted to servers
1. **API Usage**: Nominatim requests reveal approximate location
1. **Data Persistence**: No account system or cloud backup

## Deployment & Maintenance

### Hosting Requirements

- **Static Hosting**: GitHub Pages, Netlify, or similar
- **HTTPS Required**: For geolocation API access
- **No Backend**: Pure client-side application

### Update Process

1. Test changes locally
1. Validate geographic data integrity
1. Deploy to hosting platform
1. Monitor for geolocation issues across devices

### Monitoring

- **Error Tracking**: Console logs for debugging
- **User Feedback**: Manual reporting of distance calculation errors
- **Performance**: Browser developer tools for optimization

## Conclusion

The License Plate Game successfully combines geolocation technology, interactive mapping, and engaging visual design to create a unique travel tracking experience. The application handles the complex challenges of cross-platform geolocation, coordinate system conversion, and efficient geographic data processing while maintaining a user-friendly interface across multiple themes and device types.

The modular architecture and extensive documentation provide a solid foundation for future enhancements, particularly the planned voice integration features that will significantly improve the hands-free driving experience.