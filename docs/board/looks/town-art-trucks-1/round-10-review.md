# TOWN-ART-TRUCKS-1, round 10: three work trucks

This sheet shows the tanker, loaded supply truck and tow rig beside the matching exported-model views. It includes side, front and rear photo comparisons, both three-quarter views, the mayor's view and the road view. The renders were imported from `trucks-1.glb` into an empty Blender scene.

## Measurements read from the photo grids

The blue grid is 50 px per square, with major lines every 100 px. Red marks show the ground, wheel centres and measured wheel radii; orange marks show the front and rear extents. The recipe uses +Y up and puts each tire bottom at the measured ground line.

| Truck | Side photo landmarks (px) | Pixel scale | Wheel radius | Axle centres (world Z, m) | Half track |
|---|---|---:|---:|---|---:|
| Water tanker | front 24, rear 1045, ground 458; axles 190, 705, 858; wheel centre Y 370 | 9.00 m / 1021 px = 0.008815 m/px | 82 px = 0.723 m | -3.04, 1.50, 2.85 | 0.97 m |
| Supply truck | front 28, rear 930, ground 450; axles 185, 665, 790; wheel centre Y 365 | 8.20 m / 902 px = 0.009091 m/px | 78 px = 0.709 m | -2.67, 1.69, 2.83 | 0.94 m |
| Tow rig | front 28, rear 965, ground 456; axles 180, 690, 830; wheel centre Y 400 | 8.20 m / 937 px = 0.008751 m/px | 84 px = 0.735 m | -2.77, 1.69, 2.92 | 0.94 m |

The half-track values come from front-view wheel centres at 37% of the measured full tire-centre span from the vehicle centre: tanker width span 350 px at 2.62 m, supply and tow width span 296 px at 2.55 m. Rear-view spans were checked against those values (360 px, 420 px and 350 px respectively). Overhead front-to-rear spans measured 845 px, 850 px and 850 px; the wheel and body endpoints agree within the crop's soft shadows. Ground-to-frame clearances read from the side grids are 48, 46 and 54 px.

## Self-review

The four source views agree on the same cab, wheel locations and truck identity. The photo-carved bodies retain their rounded 1950s cab family, and the tires, chassis, tanker valves, hideable supply load and movable tow hook are named geometry. The supply turnarounds used for modelling show the empty bed; the comparison photos show the loaded truck. The model adds the load under `supply-truck:load`.

I checked the model against the photos at each dead-on view and in the imported three-quarter and overhead renders. Claude should review the three new trucks, especially the supply load silhouette and the tow hook from the rear and road views. The fire truck and `round-9.jpg` are unchanged.
