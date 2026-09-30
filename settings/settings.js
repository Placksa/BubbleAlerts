window.WidgetSettingsHooks = {

  createTestAlert(buttonConfig, values) {

    if (buttonConfig.value === "twitch") {
      return {
        avatarUrl: "https://static-cdn.jtvnw.net/jtv_user_pictures/92a3c6c7-3b13-4563-9725-d56a3bc12c0d-profile_image-300x300.png",
        platform: "twitch",
        username: "rexbordz",
        message: "just followed!"
      };
    }

    if (buttonConfig.value === "youtube") {
      return {
        avatarUrl: "https://static-cdn.jtvnw.net/jtv_user_pictures/92a3c6c7-3b13-4563-9725-d56a3bc12c0d-profile_image-300x300.png",
        platform: "youtube",
        username: "rexbordz",
        message: "Just subscribed!"
      };
    }

    if (buttonConfig.value === "kick") {
      return {
        avatarUrl: "https://static-cdn.jtvnw.net/jtv_user_pictures/92a3c6c7-3b13-4563-9725-d56a3bc12c0d-profile_image-300x300.png",
        platform: "kick",
        username: "rexbordz",
        message: "Just followed!"
      };
    }

    if (buttonConfig.value === "tiktok") {
      return {
        avatarUrl: "https://static-cdn.jtvnw.net/jtv_user_pictures/92a3c6c7-3b13-4563-9725-d56a3bc12c0d-profile_image-300x300.png",
        platform: "tiktok",
        username: "rexbordz",
        message: "sent Party On & On <strong>x1</strong>",
        bubbleImgUrl: "https://p19-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/c45505ece4a91d9c43e4ba98a000b006.png~tplv-obj.png"
      };
    }

    return null;
  }

};
