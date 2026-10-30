import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

private let gold = Color(red: 1, green: 0.847, blue: 0.302)

@main
struct WippLiveActivityBundle: WidgetBundle {
  var body: some Widget {
    WippCallLiveActivity()
  }
}

/// « Me montrer / Pause » for my camera during a WIPP video call, without coming back to the app.
struct WippCallLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: WippCallAttributes.self) { context in
      // Lock screen / notification banner.
      HStack(spacing: 12) {
        Image(systemName: context.state.shown ? "video.fill" : "video.slash.fill")
          .font(.title2)
          .foregroundStyle(gold)
        VStack(alignment: .leading, spacing: 2) {
          Text("Appel vidéo · \(context.attributes.name)").font(.headline).foregroundStyle(.white).lineLimit(1)
          Text(context.state.shown ? "Ta caméra est visible" : "Ta caméra est en pause").font(.subheadline).foregroundStyle(.white.opacity(0.75))
        }
        Spacer()
        ToggleButton(shown: context.state.shown)
      }
      .padding(16)
      .activityBackgroundTint(Color(red: 0.03, green: 0.05, blue: 0.09))
      .activitySystemActionForegroundColor(gold)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Image(systemName: context.state.shown ? "video.fill" : "video.slash.fill").font(.title2).foregroundStyle(gold).padding(.leading, 6)
        }
        DynamicIslandExpandedRegion(.center) {
          VStack(spacing: 2) {
            Text(context.attributes.name).font(.headline).lineLimit(1)
            Text(context.state.shown ? "Ta caméra est visible" : "Ta caméra est en pause").font(.caption).foregroundStyle(.secondary)
          }
        }
        DynamicIslandExpandedRegion(.bottom) {
          ToggleButton(shown: context.state.shown).padding(.top, 4)
        }
      } compactLeading: {
        Image(systemName: context.state.shown ? "video.fill" : "video.slash.fill").foregroundStyle(gold)
      } compactTrailing: {
        Text(context.state.shown ? "Visible" : "Pause").font(.caption2).foregroundStyle(gold)
      } minimal: {
        Image(systemName: context.state.shown ? "video.fill" : "video.slash.fill").foregroundStyle(gold)
      }
    }
  }
}

private struct ToggleButton: View {
  let shown: Bool
  var body: some View {
    Button(intent: WippToggleCameraIntent()) {
      Label(shown ? "Pause caméra" : "Me montrer", systemImage: shown ? "video.slash" : "video")
        .font(.subheadline.weight(.semibold))
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .foregroundStyle(shown ? .white : .black)
        .background(shown ? Color.white.opacity(0.18) : gold, in: Capsule())
    }
    .buttonStyle(.plain)
  }
}
