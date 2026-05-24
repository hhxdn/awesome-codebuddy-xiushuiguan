package com.xiushuiguan.service.impl;

import cn.hutool.http.HttpUtil;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.xiushuiguan.dto.LoginDTO;
import com.xiushuiguan.entity.GameConfig;
import com.xiushuiguan.entity.User;
import com.xiushuiguan.mapper.UserMapper;
import com.xiushuiguan.service.GameConfigService;
import com.xiushuiguan.service.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Slf4j
@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {

    @Autowired
    private GameConfigService gameConfigService;

    @Override
    public User login(LoginDTO dto) {
        String openid = getOpenidByCode(dto.getCode());

        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getOpenid, openid);
        User user = getOne(wrapper);

        if (user == null) {
            user = new User();
            user.setOpenid(openid);
            user.setNickname(dto.getNickname() != null ? dto.getNickname() : "水管工");
            user.setAvatarUrl(dto.getAvatarUrl() != null ? dto.getAvatarUrl() : "");
            user.setHighestLevel(0);
            user.setTotalStars(0);
            user.setCreatedAt(LocalDateTime.now());
            user.setUpdatedAt(LocalDateTime.now());
            save(user);
        } else {
            if (dto.getNickname() != null) {
                user.setNickname(dto.getNickname());
            }
            if (dto.getAvatarUrl() != null) {
                user.setAvatarUrl(dto.getAvatarUrl());
            }
            user.setUpdatedAt(LocalDateTime.now());
            updateById(user);
        }

        return user;
    }

    @Override
    public User getUserInfo(Long userId) {
        return getById(userId);
    }

    @Override
    public boolean updateProgress(Long userId, Integer highestLevel) {
        User user = getById(userId);
        if (user == null) {
            return false;
        }
        if (highestLevel > user.getHighestLevel()) {
            user.setHighestLevel(highestLevel);
            user.setUpdatedAt(LocalDateTime.now());
            return updateById(user);
        }
        return true;
    }

    private String getOpenidByCode(String code) {
        GameConfig appidConfig = gameConfigService.lambdaQuery()
                .eq(GameConfig::getConfigKey, "wx_appid").one();
        GameConfig secretConfig = gameConfigService.lambdaQuery()
                .eq(GameConfig::getConfigKey, "wx_secret").one();

        String appid = appidConfig != null ? appidConfig.getConfigValue() : "";
        String secret = secretConfig != null ? secretConfig.getConfigValue() : "";

        if (appid.isEmpty() || secret.isEmpty()) {
            log.warn("微信AppID或Secret未配置，使用code作为openid（开发模式）");
            return "dev_" + code;
        }

        String url = String.format(
                "https://api.weixin.qq.com/sns/jscode2session?appid=%s&secret=%s&js_code=%s&grant_type=authorization_code",
                appid, secret, code
        );

        try {
            String response = HttpUtil.get(url);
            JSONObject json = JSONUtil.parseObj(response);
            if (json.containsKey("openid")) {
                return json.getStr("openid");
            }
            log.error("微信登录失败: {}", response);
            throw new RuntimeException("微信登录失败: " + json.getStr("errmsg"));
        } catch (Exception e) {
            log.error("调用微信登录接口异常", e);
            throw new RuntimeException("微信登录接口调用失败");
        }
    }
}
