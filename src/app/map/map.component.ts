import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import * as atlas from 'azure-maps-control';
import { drawing, control } from 'azure-maps-drawing-tools';
import { FirebaseService } from '../firebase.service';
import * as GeoJSON from 'geojson';
import { ListItem } from 'carbon-components-angular';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.sass'],
})
export class MapComponent implements AfterViewInit {
  @ViewChild('mapContainerInner', { static: true })
  mapContainerInner: ElementRef;
  private map: atlas.Map;
  private drawingManager: drawing.DrawingManager;
  private features: atlas.Shape[] = [];
  private currentMeasurement: 'line' | 'polygon' | null = null;

  selectedProperty: string;
  properties: ListItem[] = [];
  pointLayer: atlas.layer.BubbleLayer;
  lineLayer: atlas.layer.LineLayer;
  polygonLayer: atlas.layer.PolygonLayer;
  selectedPropertyValues: string[] = [];
  valueColorMap: { [key: string]: string } = {};
  label = 'Property';

  hideLabel = false;
  skeleton = false;
  helperText = 'Select a property';
  size = 'md';
  dropUp = false;
  invalid = false;
  invalidText = '';
  warn = false;
  warnText = '';
  theme = 'light';
  disabled = false;
  readonly = false;

  measurementInfo: string = '';

  color = '#000000';

  constructor(private firebaseService: FirebaseService) {}

  ngAfterViewInit(): void {
    this.initMap();
    this.initDrawingManager();
  }

  isPanelHidden: boolean = false;

  togglePanel(): void {
    this.isPanelHidden = !this.isPanelHidden;
  }

  isModalOpen = true;

  openModal() {
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  onClose(close: any) {}

  initMap(): void {
    this.map = new atlas.Map(this.mapContainerInner.nativeElement, {
      center: [0, 0],
      zoom: 2,
      authOptions: {
        authType: atlas.AuthenticationType.subscriptionKey,
        subscriptionKey: '5px69u6-Ip7aV4oN98U9OuqW_CoTU4lokXmi5J1w9sk',
      },
    });

    this.map.events.add('ready', () => {
      this.initDrawingManager();
      this.addMapClickEvent();

      // Map controls
      this.map.controls.add(
        [
          new atlas.control.ZoomControl(),
          new atlas.control.PitchControl(),
          new atlas.control.CompassControl(),
          new atlas.control.StyleControl({
            mapStyles: 'all',
          }),
        ],
        {
          position: atlas.ControlPosition.TopRight,
        }
      );
    });
  }

  initDrawingManager(): void {
    this.drawingManager = new drawing.DrawingManager(this.map, {
      toolbar: new control.DrawingToolbar({
        buttons: [
          'draw-line',
          'draw-polygon',
          'draw-rectangle',
          'draw-circle',
          'edit-geometry',
        ],
        position: 'top-right',
        style: 'light',
      }),
    });

    this.map.events.add('drawingmodechanged', this.drawingManager, (mode) => {
      if (mode.startsWith('draw')) {
        this.drawingManager.getSource().clear();
        this.measurementInfo = '';
      }
    });

    this.map.events.add('drawingchanging', this.drawingManager, (shape) =>
      this.measureShape(shape)
    );
    this.map.events.add('drawingchanged', this.drawingManager, (shape) =>
      this.measureShape(shape)
    );
    this.map.events.add('drawingcomplete', this.drawingManager, (shape) =>
      this.drawingComplete(shape)
    );
  }

  drawingComplete(shape: atlas.Shape): void {
    this.drawingManager.setOptions({ mode: null });
    this.measureShape(shape);
  }

  measureShape(shape: atlas.Shape): void {
    let msg = '';

    if (shape.isCircle()) {
      const radius = atlas.math.convertDistance(
        shape.getProperties().radius,
        'meters',
        'miles',
        2
      );
      const area = Math.round(2 * Math.PI * radius * radius * 100) / 100;
      const perimeter = Math.round(2 * Math.PI * radius * 100) / 100;
      msg = `Radius: ${radius} mi<br/>Area: ${area} sq mi<br/>Perimeter: ${perimeter} mi`;
    } else {
      const geometry = shape.toJson().geometry;
      let polygon;

      switch (shape.getType()) {
        case 'LineString':
          if (Array.isArray(geometry.coordinates)) {
            const length =
              Math.round(
                atlas.math.getLengthOfPath(
                  geometry.coordinates as atlas.data.Position[],
                  'miles'
                ) * 100
              ) / 100;
            msg = `Length: ${length} mi`;
          }
          if (this.drawingManager.getOptions().mode === 'draw-polygon') {
            polygon = new atlas.data.Polygon(
              geometry.coordinates as atlas.data.Position[][]
            );
          }
          break;
        case 'Polygon':
          if (Array.isArray(geometry.coordinates)) {
            polygon = geometry;
            const perimeter =
              Math.round(
                atlas.math.getLengthOfPath(
                  geometry.coordinates[0] as atlas.data.Position[],
                  'miles'
                ) * 100
              ) / 100;
            msg = `Perimeter: ${perimeter} mi`;
          }
          break;
      }

      if (polygon) {
        const areaInSquareMeters = atlas.math.getArea(
          polygon,
          atlas.math.AreaUnits.squareMeters,
          2
        );
        const areaInSquareMiles = areaInSquareMeters / 2589988.11;
        msg += `<br/>Area: ${areaInSquareMiles.toFixed(2)} sq mi`;
      }
    }

    this.measurementInfo = msg;
    document.getElementById('measurementInfo').innerHTML = msg;
  }

  addMapClickEvent(): void {
    this.map.events.add('click', (e) => {
      const features = this.map.layers.getRenderedShapes(e.position);
      if (features.length > 0) {
        let popupContent = '<table>';
        features.forEach((feature) => {
          const properties =
            feature instanceof atlas.Shape
              ? feature.getProperties()
              : feature.properties;
          for (const key in properties) {
            if (properties.hasOwnProperty(key)) {
              const value = properties[key];
              if (
                value !== null &&
                typeof value === 'string' &&
                value.trim() !== ''
              ) {
                popupContent += `<tr><td>${key}</td><td>${value}</td></tr>`;
              }
            }
          }
        });
        popupContent += '</table>';
        new atlas.Popup({
          position: e.position,
          content: popupContent,
        }).open(this.map);
      }
    });
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];

    if (!file) {
      console.error('No file selected');
      return;
    }

    const reader = new FileReader();

    reader.onload = (e: any) => {
      try {
        const geoJson = JSON.parse(e.target.result);

        if (!this.map) {
          console.error('Map is not initialized');
          return;
        }

        const dataSource = new atlas.source.DataSource();
        dataSource.add(geoJson);
        this.map.sources.add(dataSource);

        this.pointLayer = new atlas.layer.BubbleLayer(dataSource, null, {
          filter: ['in', '$type', 'Point'],
        });
        this.lineLayer = new atlas.layer.LineLayer(dataSource, null, {
          filter: ['in', '$type', 'LineString'],
        });
        this.polygonLayer = new atlas.layer.PolygonLayer(dataSource, null, {
          filter: ['in', '$type', 'Polygon'],
        });

        this.map.layers.add([
          this.pointLayer,
          this.lineLayer,
          this.polygonLayer,
        ]);

        this.features = dataSource.getShapes();
        this.properties = [];

        const uniqueKeys = new Set<string>();
        this.features.forEach((feature) => {
          const properties = feature.getProperties();
          Object.keys(properties).forEach((key) => {
            if (!uniqueKeys.has(key)) {
              uniqueKeys.add(key);
              this.properties.push({ content: key, selected: false });
            }
          });
        });

        const bbox = atlas.data.BoundingBox.fromData(geoJson);
        this.map.setCamera({
          bounds: bbox,
          padding: 40,
        });

        this.firebaseService
          .uploadFile(file)
          .then(() => {
            console.log('File uploaded to Firebase Storage');
            this.closeModal();
          })
          .catch((error) => {
            console.error('Error uploading file:', error);
          });

        this.updateMapLayers();
      } catch (error) {
        console.error('Error processing GeoJSON file:', error);
      }
    };

    reader.readAsText(file);
  }

  selectProperty(event: any): void {
    const selectedValue = event.item.content;
    this.selectedProperty = selectedValue;

    console.log('Selected property:', this.selectedProperty);

    this.selectedPropertyValues = this.getValues(this.selectedProperty);

    console.log('Selected property values:', this.selectedPropertyValues);

    this.updateMapLayers();
  }

  changeColor(value: string, event: any): void {
    const color = event.target.value;
    this.valueColorMap[value] = color;
    this.updateMapLayers();
  }

  updateMapLayers(): void {
    const selectedProperty = this.selectedProperty;
    const values = this.getValues(selectedProperty);

    this.map.layers.remove(this.pointLayer);
    this.map.layers.remove(this.lineLayer);
    this.map.layers.remove(this.polygonLayer);

    const dataSource = new atlas.source.DataSource();
    this.features.forEach((feature) => {
      const properties = feature.getProperties();
      const value = properties[selectedProperty];
      const color = this.valueColorMap[value] || 'green';

      if (feature instanceof atlas.Shape) {
        feature.setProperties({ ...properties, color: color });
      }
      dataSource.add(feature);
    });

    this.pointLayer = new atlas.layer.BubbleLayer(dataSource, null, {
      filter: ['in', '$type', 'Point'],
      color: ['get', 'color'],
    });

    this.lineLayer = new atlas.layer.LineLayer(dataSource, null, {
      filter: ['in', '$type', 'LineString'],
      strokeColor: ['get', 'color'],
    });

    this.polygonLayer = new atlas.layer.PolygonLayer(dataSource, null, {
      filter: ['in', '$type', 'Polygon'],
      fillColor: ['get', 'color'],
    });

    this.map.sources.add(dataSource);
    this.map.layers.add([this.pointLayer, this.lineLayer, this.polygonLayer]);
  }

  getValues(property: string): string[] {
    if (!property) return [];
    return this.features
      .map((feature) => feature.getProperties()[property])
      .filter((value, index, self) => self.indexOf(value) === index);
  }
}
