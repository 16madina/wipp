import { StyleSheet, View } from 'react-native';

import type { FaceKind } from '@/chats/data';

type FaceSpec = {
  skin: string;
  hair: string;
  hairHeight: number;
  eyeTop?: number;
  shirt?: string;
  beard?: boolean;
  glasses?: boolean;
  scarf?: boolean;
  sideHair?: boolean;
};

const faces: Record<Exclude<FaceKind, 'famille'>, FaceSpec> = {
  vous: {
    skin: '#E8B898',
    hair: '#241C16',
    hairHeight: 0.4,
    shirt: '#7E8C9E',
  },
  samira: {
    skin: '#C9845A',
    hair: '#E23E78',
    hairHeight: 0.5,
    eyeTop: 0.58,
    scarf: true,
  },
  julien: {
    skin: '#E0A878',
    hair: '#6B4A32',
    hairHeight: 0.4,
    beard: true,
    glasses: true,
  },
  maya: {
    skin: '#F2C7A4',
    hair: '#1A1210',
    hairHeight: 0.42,
    sideHair: true,
  },
  alex: {
    skin: '#C48B62',
    hair: '#1C140F',
    hairHeight: 0.4,
    beard: true,
  },
  six: {
    skin: '#F6D7C3',
    hair: '#241810',
    hairHeight: 0.44,
    sideHair: true,
  },
  ines: {
    skin: '#E8C4A4',
    hair: '#2C211C',
    hairHeight: 0.4,
    sideHair: true,
  },
  lea: {
    skin: '#F3D2B8',
    hair: '#A56B3C',
    hairHeight: 0.42,
  },
};

export function Face({ kind, size }: { kind: FaceKind; size: number }) {
  if (kind === 'famille') return <FamilyFace size={size} />;

  const spec = faces[kind];
  const eye = size * 0.09;

  return (
    <View style={[styles.clip, { width: size, height: size, borderRadius: size / 2, backgroundColor: spec.skin }]}>
      {spec.shirt ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: size * 0.32,
            backgroundColor: spec.shirt,
          }}
        />
      ) : null}
      <View
        style={{
          position: 'absolute',
          top: spec.scarf ? -size * 0.04 : -size * 0.06,
          left: spec.scarf ? -size * 0.06 : size * 0.1,
          right: spec.scarf ? -size * 0.06 : size * 0.1,
          height: size * spec.hairHeight,
          borderBottomLeftRadius: size,
          borderBottomRightRadius: size,
          backgroundColor: spec.hair,
        }}
      />
      {spec.sideHair ? (
        <>
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: size * 0.22,
              bottom: 0,
              width: size * 0.16,
              backgroundColor: spec.hair,
            }}
          />
          <View
            style={{
              position: 'absolute',
              right: 0,
              top: size * 0.22,
              bottom: 0,
              width: size * 0.16,
              backgroundColor: spec.hair,
            }}
          />
        </>
      ) : null}
      {spec.beard ? (
        <View
          style={{
            position: 'absolute',
            alignSelf: 'center',
            bottom: size * 0.06,
            width: size * 0.48,
            height: size * 0.26,
            borderTopLeftRadius: size,
            borderTopRightRadius: size,
            backgroundColor: spec.hair,
          }}
        />
      ) : null}
      <View
        style={{
          position: 'absolute',
          top: size * (spec.eyeTop ?? 0.44),
          left: size * 0.28,
          width: eye,
          height: eye,
          borderRadius: eye,
          backgroundColor: '#2A2118',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * (spec.eyeTop ?? 0.44),
          right: size * 0.28,
          width: eye,
          height: eye,
          borderRadius: eye,
          backgroundColor: '#2A2118',
        }}
      />
      {spec.glasses ? <Glasses size={size} /> : null}
      {spec.beard ? null : (
        <View
          style={{
            position: 'absolute',
            alignSelf: 'center',
            top: size * 0.6,
            width: size * 0.16,
            height: size * 0.08,
            borderBottomWidth: Math.max(1, size * 0.025),
            borderColor: '#8A5A48',
            borderRadius: size,
          }}
        />
      )}
    </View>
  );
}

function Glasses({ size }: { size: number }) {
  const lens = size * 0.24;
  return (
    <View
      style={{
        position: 'absolute',
        top: size * 0.38,
        left: size * 0.14,
        right: size * 0.14,
        height: lens,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View
        style={{
          width: lens,
          height: lens * 0.78,
          borderRadius: 4,
          borderWidth: Math.max(1, size * 0.03),
          borderColor: '#3A3330',
        }}
      />
      <View style={{ width: size * 0.08, height: Math.max(1, size * 0.03), backgroundColor: '#3A3330' }} />
      <View
        style={{
          width: lens,
          height: lens * 0.78,
          borderRadius: 4,
          borderWidth: Math.max(1, size * 0.03),
          borderColor: '#3A3330',
        }}
      />
    </View>
  );
}

function FamilyFace({ size }: { size: number }) {
  return (
    <View style={[styles.clip, { width: size, height: size, borderRadius: size / 2, backgroundColor: '#E08A45' }]}>
      <View
        style={{
          position: 'absolute',
          left: size * 0.12,
          bottom: size * 0.12,
          width: size * 0.42,
          height: size * 0.42,
          borderRadius: size,
          backgroundColor: '#F3D0A8',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: size * 0.18,
          top: size * 0.16,
          width: size * 0.3,
          height: size * 0.22,
          borderBottomLeftRadius: size,
          borderBottomRightRadius: size,
          backgroundColor: '#5C3A28',
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: size * 0.1,
          bottom: size * 0.16,
          width: size * 0.34,
          height: size * 0.34,
          borderRadius: size,
          backgroundColor: '#C46B3A',
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: size * 0.14,
          top: size * 0.28,
          width: size * 0.26,
          height: size * 0.16,
          borderBottomLeftRadius: size,
          borderBottomRightRadius: size,
          backgroundColor: '#3E2418',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
});
