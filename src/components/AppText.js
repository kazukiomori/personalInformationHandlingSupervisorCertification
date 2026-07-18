import React from 'react';
import { Text as RNText } from 'react-native';

// Androidは端末のシステム言語(ロケール)によって、漢字が中国語の字形で表示されてしまうことがある。
// 日本語の字形を持つフォントを明示的に指定することで、端末のロケールに関わらず正しい字形で表示する。
const AppText = React.forwardRef(({ style, ...props }, ref) => (
  <RNText ref={ref} {...props} style={[{ fontFamily: 'NotoSansJP_400Regular' }, style]} />
));

export default AppText;
