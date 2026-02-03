declare module 'upng-js';

declare module 'react-native-view-shot' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';

  export interface ViewShotProperties extends ViewProps {
    options?: {
      width?: number;
      height?: number;
      format?: 'png' | 'jpg' | 'webm' | 'raw';
      quality?: number;
      result?: 'tmpfile' | 'base64' | 'data-uri';
      snapshotContentContainer?: boolean;
    };
    captureMode?: 'mount' | 'continuous' | 'update';
    children?: React.ReactNode;
  }

  export default class ViewShot extends Component<ViewShotProperties> {
    capture(): Promise<string>;
  }
}